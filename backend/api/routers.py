import io
from dataclasses import dataclass
from typing import List, Optional

import pandas as pd
from fastapi import APIRouter, Depends, File, Header, HTTPException, Query, Response, UploadFile
from sqlalchemy import and_, text
from sqlalchemy.orm import Session

from core.config import settings
from core.database import get_db
from core.security import get_current_user
from models.models import Candidate, User
from schemas.schemas import (
    AIStatusResponse,
    AITestKeyResponse,
    CandidateResponse,
    JDMatchRequest,
    JDMatchResponse,
    JDMatchResultItem,
    ProcessedResumeResponse,
    ReindexResponse,
    SemanticSearchResponse,
    SemanticSearchResultItem,
)
from services.extractor import (
    extract_all_metadata,
    extract_candidate_name,
    extract_skills_naive,
)
from services.file_parser import parse_upload_file
from services.llm_service import (
    AVAILABLE_GEMINI_MODELS,
    llm_service,
    redact_pii_fallback,
)
from services.ml_service import ml_service
from services.search_service import search_candidates_semantic, serialize_candidate

router = APIRouter()


@dataclass(frozen=True)
class AIRequestContext:
    api_key: Optional[str] = None
    model: Optional[str] = None


def get_ai_context(
    x_gemini_api_key: Optional[str] = Header(default=None, alias="X-Gemini-API-Key"),
    x_gemini_model: Optional[str] = Header(default=None, alias="X-Gemini-Model"),
) -> AIRequestContext:
    clean_key = (x_gemini_api_key or "").strip() or None
    clean_model = (x_gemini_model or "").strip() or None
    if clean_model and clean_model not in AVAILABLE_GEMINI_MODELS:
        clean_model = None
    return AIRequestContext(api_key=clean_key, model=clean_model)


@router.get("/settings/ai-status", response_model=AIStatusResponse, tags=["Settings (BYOK)"])
def get_ai_status(
    ai_ctx: AIRequestContext = Depends(get_ai_context),
    current_user: User = Depends(get_current_user),
):
    server_configured = bool((settings.GEMINI_API_KEY or "").strip())
    if ai_ctx.api_key:
        active_mode = "byok"
    elif server_configured:
        active_mode = "server_default"
    else:
        active_mode = "heuristic_only"

    return AIStatusResponse(
        active_mode=active_mode,
        server_default_configured=server_configured,
        active_model=ai_ctx.model or settings.GEMINI_MODEL,
        embedding_model=settings.GEMINI_EMBEDDING_MODEL,
        embedding_dimensions=settings.EMBEDDING_DIMENSIONS,
        available_models=AVAILABLE_GEMINI_MODELS,
    )


@router.post("/settings/test-ai-key", response_model=AITestKeyResponse, tags=["Settings (BYOK)"])
def test_ai_key(
    ai_ctx: AIRequestContext = Depends(get_ai_context),
    current_user: User = Depends(get_current_user),
):
    mode = "byok" if ai_ctx.api_key else "server_default"
    valid, dims, message = llm_service.verify_api_key(
        api_key_override=ai_ctx.api_key,
        model_override=ai_ctx.model,
    )
    if not valid:
        raise HTTPException(status_code=400, detail=message)
    return AITestKeyResponse(
        valid=True,
        mode=mode,
        model=ai_ctx.model or settings.GEMINI_MODEL,
        embedding_dimensions=dims,
        message=message,
    )


@router.get("/health", tags=["System"])
def health_check(db: Session = Depends(get_db)):
    db_status = "ok"
    pgvector_enabled = False
    try:
        db.execute(text("SELECT 1"))
        if db.bind and db.bind.dialect.name == "postgresql":
            ext = db.execute(
                text("SELECT 1 FROM pg_extension WHERE extname = 'vector'")
            ).first()
            pgvector_enabled = bool(ext)
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Database unavailable: {exc}")

    return {
        "status": "healthy",
        "database": db_status,
        "pgvector": pgvector_enabled,
    }


@router.get("/candidates", response_model=List[CandidateResponse], tags=["Candidates"])
def get_candidates(
    response: Response,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    keyword: Optional[str] = None,
    industry: Optional[str] = None,
    experience: Optional[str] = None,
    work_mode: Optional[str] = None,
    blind_mode: bool = False,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
):
    query = db.query(Candidate)

    filters = []
    if industry:
        filters.append(Candidate.primary_industry == industry)
    if experience:
        filters.append(Candidate.experience_level == experience)
    if work_mode:
        filters.append(Candidate.work_mode == work_mode)
    if keyword:
        search_term = f"%{keyword.lower()}%"
        filters.append(Candidate.resume_text.ilike(search_term))

    if filters:
        query = query.filter(and_(*filters))

    total = query.count()
    response.headers["X-Total-Count"] = str(total)

    candidates = (
        query.order_by(Candidate.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [serialize_candidate(c, blind_mode=blind_mode) for c in candidates]


@router.get(
    "/candidates/search",
    response_model=SemanticSearchResponse,
    tags=["Semantic Search"],
)
def semantic_search_candidates(
    q: str = Query(..., min_length=2, max_length=1000, description="Natural language search query"),
    industry: Optional[str] = None,
    experience: Optional[str] = None,
    work_mode: Optional[str] = None,
    top_k: int = Query(10, ge=1, le=50),
    blind_mode: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    ai_ctx: AIRequestContext = Depends(get_ai_context),
):
    ranked, search_mode = search_candidates_semantic(
        db=db,
        query_text=q,
        top_k=top_k,
        industry=industry,
        experience=experience,
        work_mode=work_mode,
        api_key_override=ai_ctx.api_key,
    )
    items = [
        SemanticSearchResultItem(
            candidate=serialize_candidate(cand, blind_mode=blind_mode),
            similarity_score=score,
        )
        for cand, score in ranked
    ]
    return SemanticSearchResponse(
        query=q,
        search_mode=search_mode,
        blind_mode=blind_mode,
        total=len(items),
        results=items,
    )


@router.post(
    "/candidates/reindex",
    response_model=ReindexResponse,
    tags=["Semantic Search"],
)
def reindex_missing_embeddings(
    batch_size: int = Query(25, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    ai_ctx: AIRequestContext = Depends(get_ai_context),
):
    missing = (
        db.query(Candidate)
        .filter(Candidate.embedding.is_(None))
        .limit(batch_size)
        .all()
    )
    embedded_count = 0
    for cand in missing:
        if not cand.redacted_resume_text and cand.resume_text:
            cand.redacted_resume_text = redact_pii_fallback(cand.resume_text, cand.name)
            cand.is_blind_mode_ready = True

        doc_parts = [
            f"Role: {cand.role or ''}",
            f"Industry: {cand.primary_industry or ''} / {cand.secondary_industry or ''}",
            f"Experience: {cand.experience_level or ''}",
            f"Skills: {', '.join(cand.skills or [])}",
            (cand.redacted_resume_text or cand.resume_text or "")[:8000],
        ]
        vec = llm_service.generate_embedding(
            "\n".join(doc_parts),
            task_type="RETRIEVAL_DOCUMENT",
            api_key_override=ai_ctx.api_key,
        )
        if vec is not None:
            cand.embedding = vec
            embedded_count += 1

    db.commit()
    remaining = db.query(Candidate).filter(Candidate.embedding.is_(None)).count()
    return ReindexResponse(
        processed=len(missing),
        embedded=embedded_count,
        remaining_without_embeddings=remaining,
    )


@router.get("/candidates/{candidate_id}", response_model=CandidateResponse, tags=["Candidates"])
def get_candidate(
    candidate_id: str,
    blind_mode: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return serialize_candidate(candidate, blind_mode=blind_mode)


@router.delete("/candidates/{candidate_id}", status_code=204, tags=["Candidates"])
def delete_candidate(
    candidate_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    db.delete(candidate)
    db.commit()
    return None


@router.post("/match", response_model=JDMatchResponse, tags=["Agentic Matching"])
def match_candidates_to_jd(
    payload: JDMatchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    ai_ctx: AIRequestContext = Depends(get_ai_context),
):
    search_query = (
        f"{payload.job_title}\n{payload.job_description}"
        if payload.job_title
        else payload.job_description
    )
    ranked, search_mode = search_candidates_semantic(
        db=db,
        query_text=search_query,
        top_k=payload.top_k,
        industry=payload.industry,
        experience=payload.experience,
        work_mode=payload.work_mode,
        api_key_override=ai_ctx.api_key,
    )

    if not ranked:
        return JDMatchResponse(
            job_title=payload.job_title,
            blind_mode=payload.blind_mode,
            evaluated_count=0,
            search_mode=search_mode,
            evaluation_mode="heuristic_fallback",
            matches=[],
        )

    # Always pass anonymized (PII-free) candidate context to the LLM evaluator,
    # and serialize candidate responses before releasing the DB transaction.
    llm_candidates_payload = []
    serialized_map = {}
    for cand, sim_score in ranked:
        serialized_map[cand.id] = (
            serialize_candidate(cand, blind_mode=payload.blind_mode),
            sim_score,
        )
        redacted_body = cand.redacted_resume_text or redact_pii_fallback(
            cand.resume_text or "", cand.name
        )
        llm_candidates_payload.append(
            {
                "candidate_id": cand.id,
                "role": cand.role or "",
                "primary_industry": cand.primary_industry or "",
                "secondary_industry": cand.secondary_industry or "",
                "experience_level": cand.experience_level or "",
                "work_mode": cand.work_mode or "",
                "skills": cand.skills or [],
                "career_summary": cand.career_summary or "",
                "vector_similarity": sim_score,
                "redacted_excerpt": redacted_body[:2500],
            }
        )

    # Release DB connection/transaction before Gemini re-ranking call
    db.rollback()

    evaluations, evaluation_mode = llm_service.evaluate_jd_matches(
        job_description=payload.job_description,
        candidates_payload=llm_candidates_payload,
        job_title=payload.job_title,
        api_key_override=ai_ctx.api_key,
        model_override=ai_ctx.model,
    )

    eval_by_id = {ev.candidate_id: ev for ev in evaluations}
    match_items: List[JDMatchResultItem] = []

    for cand_id, (serialized_cand, sim_score) in serialized_map.items():
        ev = eval_by_id.get(cand_id)
        if ev is None:
            match_score = int(round(sim_score * 100))
            matched_skills: List[str] = []
            missing_skills: List[str] = []
            justification = "Ranked by semantic vector similarity to the job description."
            questions: List[str] = []
        else:
            match_score = ev.match_score
            matched_skills = ev.matched_skills
            missing_skills = ev.missing_skills
            justification = ev.justification
            questions = ev.recommended_interview_questions

        match_items.append(
            JDMatchResultItem(
                candidate=serialized_cand,
                vector_similarity=sim_score,
                match_score=match_score,
                matched_skills=matched_skills,
                missing_skills=missing_skills,
                justification=justification,
                recommended_interview_questions=questions,
            )
        )

    match_items.sort(key=lambda item: (item.match_score, item.vector_similarity), reverse=True)

    return JDMatchResponse(
        job_title=payload.job_title,
        blind_mode=payload.blind_mode,
        evaluated_count=len(match_items),
        search_mode=search_mode,
        evaluation_mode=evaluation_mode,
        matches=match_items,
    )


@router.post("/upload", response_model=List[ProcessedResumeResponse], tags=["Ingestion"])
async def upload_resumes(
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    ai_ctx: AIRequestContext = Depends(get_ai_context),
):
    responses = []
    uploader_id = current_user.id

    for file in files:
        try:
            resume_text = await parse_upload_file(file)

            if not resume_text.strip():
                responses.append(
                    ProcessedResumeResponse(
                        filename=file.filename or "unknown",
                        status="Failed",
                        error="No text extracted",
                    )
                )
                continue

            existing_candidate = (
                db.query(Candidate).filter(Candidate.resume_text == resume_text).first()
            )
            if existing_candidate:
                responses.append(
                    ProcessedResumeResponse(
                        filename=file.filename or "unknown",
                        status="Skipped (Duplicate)",
                        candidate_id=existing_candidate.id,
                    )
                )
                continue

            # Release DB transaction before external Gemini API calls to avoid
            # holding serverless Neon SSL sockets idle during LLM inference.
            db.rollback()

            analysis = llm_service.analyze_resume(
                resume_text,
                filename=file.filename or "unknown",
                api_key_override=ai_ctx.api_key,
                model_override=ai_ctx.model,
            )
            embedding_doc = llm_service.build_embedding_document(analysis, resume_text)
            embedding = llm_service.generate_embedding(
                embedding_doc,
                task_type="RETRIEVAL_DOCUMENT",
                api_key_override=ai_ctx.api_key,
            )

            candidate_email = analysis.candidate_email
            if candidate_email:
                email_exists = (
                    db.query(Candidate)
                    .filter(Candidate.email == candidate_email)
                    .first()
                )
                if email_exists:
                    candidate_email = None

            candidate = Candidate(
                name=analysis.candidate_name
                or extract_candidate_name(resume_text, file.filename or "unknown"),
                email=candidate_email,
                role=analysis.role,
                primary_industry=analysis.primary_industry,
                secondary_industry=analysis.secondary_industry,
                confidence_score=analysis.confidence_score,
                experience_level=analysis.experience_level,
                work_mode=analysis.work_mode,
                resume_text=resume_text,
                redacted_resume_text=analysis.redacted_resume_text,
                is_blind_mode_ready=analysis.is_blind_mode_ready,
                skills=analysis.skills,
                education=[e.model_dump() for e in analysis.education],
                previous_roles=[r.model_dump() for r in analysis.previous_roles],
                career_summary=analysis.career_summary,
                embedding=embedding,
                uploaded_by_id=uploader_id,
            )

            db.add(candidate)
            db.commit()
            db.refresh(candidate)

            responses.append(
                ProcessedResumeResponse(
                    filename=file.filename or "unknown",
                    status="Success",
                    candidate_id=candidate.id,
                )
            )

        except Exception as exc:
            db.rollback()
            responses.append(
                ProcessedResumeResponse(
                    filename=file.filename or "unknown",
                    status="Failed",
                    error=str(exc),
                )
            )

    return responses


@router.post("/seed", response_model=List[ProcessedResumeResponse], tags=["Ingestion"])
async def seed_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    content = await file.read()
    responses = []
    try:
        df = pd.read_csv(io.BytesIO(content))
        if "Resume_str" not in df.columns:
            raise HTTPException(
                status_code=400, detail="CSV must contain a 'Resume_str' column"
            )

        for index, row in df.iterrows():
            resume_text = str(row["Resume_str"])

            existing_candidate = (
                db.query(Candidate).filter(Candidate.resume_text == resume_text).first()
            )
            if existing_candidate:
                continue

            if "Category" in df.columns:
                primary_industry = str(row["Category"]).upper().replace(" ", "-")
            else:
                primary_industry = ml_service.predict_industry(resume_text)

            metadata = extract_all_metadata(resume_text, primary_industry)
            skills = extract_skills_naive(resume_text)

            secondary = metadata.get("secondary_industry")
            final_role = (
                secondary if secondary and "General" not in secondary else primary_industry
            )

            candidate_name = extract_candidate_name(
                resume_text, file.filename or "seed.csv"
            )
            candidate = Candidate(
                name=candidate_name,
                role=final_role,
                primary_industry=primary_industry,
                secondary_industry=secondary,
                confidence_score=0.75,
                experience_level=metadata.get("experience_level"),
                work_mode=metadata.get("work_mode"),
                resume_text=resume_text,
                redacted_resume_text=redact_pii_fallback(resume_text, candidate_name),
                is_blind_mode_ready=True,
                skills=skills,
                uploaded_by_id=current_user.id,
            )
            db.add(candidate)
            if index > 200:
                break

        db.commit()
        responses.append(
            ProcessedResumeResponse(
                filename=file.filename or "seed.csv",
                status="Success",
                candidate_id="seeded_batch",
            )
        )
    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(exc))

    return responses
