import math
from typing import List, Optional, Tuple

from sqlalchemy import and_
from sqlalchemy.orm import Session

from models.models import Candidate
from schemas.schemas import CandidateResponse
from services.llm_service import llm_service


def serialize_candidate(
    candidate: Candidate,
    blind_mode: bool = False,
) -> CandidateResponse:
    """Serialize a Candidate ORM model, enforcing server-side PII masking in blind mode."""
    data = CandidateResponse.model_validate(candidate)
    if blind_mode:
        short_id = candidate.id[:8].upper()
        data.name = f"Blind Candidate #{short_id}"
        data.email = None
        if data.redacted_resume_text:
            data.resume_text = data.redacted_resume_text
        if data.education:
            data.education = [
                {**entry, "institution": "[REDACTED_INSTITUTION]"}
                for entry in data.education
            ]
    return data


def _cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
    if not vec_a or not vec_b or len(vec_a) != len(vec_b):
        return 0.0
    dot = sum(a * b for a, b in zip(vec_a, vec_b))
    norm_a = math.sqrt(sum(a * a for a in vec_a))
    norm_b = math.sqrt(sum(b * b for b in vec_b))
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return max(0.0, min(1.0, dot / (norm_a * norm_b)))


def _apply_candidate_filters(
    query,
    industry: Optional[str] = None,
    experience: Optional[str] = None,
    work_mode: Optional[str] = None,
):
    filters = []
    if industry:
        filters.append(Candidate.primary_industry == industry)
    if experience:
        filters.append(Candidate.experience_level == experience)
    if work_mode:
        filters.append(Candidate.work_mode == work_mode)
    if filters:
        query = query.filter(and_(*filters))
    return query


def _keyword_score(candidate: Candidate, query_text: str) -> float:
    tokens = [t.lower() for t in query_text.split() if len(t) >= 2]
    if not tokens:
        return 0.0
    haystack = " ".join(
        [
            candidate.role or "",
            candidate.primary_industry or "",
            candidate.secondary_industry or "",
            candidate.career_summary or "",
            " ".join(candidate.skills or []),
            (candidate.redacted_resume_text or candidate.resume_text or "")[:3000],
        ]
    ).lower()
    hits = sum(1 for tok in set(tokens) if tok in haystack)
    return round(min(1.0, hits / max(len(set(tokens)), 1)), 4)


def search_candidates_semantic(
    db: Session,
    query_text: str,
    top_k: int = 10,
    industry: Optional[str] = None,
    experience: Optional[str] = None,
    work_mode: Optional[str] = None,
    api_key_override: Optional[str] = None,
) -> Tuple[List[Tuple[Candidate, float]], str]:
    """
    Retrieve top-K candidates using pgvector cosine similarity on PostgreSQL,
    Python cosine similarity on SQLite (tests), or keyword fallback if no embeddings exist.
    """
    query_embedding = llm_service.generate_embedding(
        query_text,
        task_type="RETRIEVAL_QUERY",
        api_key_override=api_key_override,
    )
    dialect_name = db.bind.dialect.name if db.bind is not None else ""

    if query_embedding is not None:
        if dialect_name == "postgresql":
            distance_expr = Candidate.embedding.cosine_distance(query_embedding).label(
                "distance"
            )
            pg_query = db.query(Candidate, distance_expr).filter(
                Candidate.embedding.isnot(None)
            )
            pg_query = _apply_candidate_filters(
                pg_query, industry=industry, experience=experience, work_mode=work_mode
            )
            rows = pg_query.order_by(distance_expr.asc()).limit(top_k).all()
            if rows:
                results = [
                    (cand, round(max(0.0, min(1.0, 1.0 - float(dist))), 4))
                    for cand, dist in rows
                ]
                return results, "vector"
        else:
            # SQLite / in-memory unit-test path using stored vector lists
            base_q = _apply_candidate_filters(
                db.query(Candidate).filter(Candidate.embedding.isnot(None)),
                industry=industry,
                experience=experience,
                work_mode=work_mode,
            )
            scored: List[Tuple[Candidate, float]] = []
            for cand in base_q.all():
                if isinstance(cand.embedding, list):
                    sim = _cosine_similarity(query_embedding, cand.embedding)
                    scored.append((cand, round(sim, 4)))
            if scored:
                scored.sort(key=lambda pair: pair[1], reverse=True)
                return scored[:top_k], "vector"

    # Graceful keyword fallback when embeddings aren't indexed or API key is absent
    fallback_q = _apply_candidate_filters(
        db.query(Candidate),
        industry=industry,
        experience=experience,
        work_mode=work_mode,
    )
    candidates = fallback_q.all()
    scored_fallback = [(cand, _keyword_score(cand, query_text)) for cand in candidates]
    scored_fallback = [pair for pair in scored_fallback if pair[1] > 0.0]
    scored_fallback.sort(key=lambda pair: pair[1], reverse=True)
    return scored_fallback[:top_k], "keyword_fallback"
