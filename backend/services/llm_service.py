import json
import logging
import re
import time
from typing import List, Optional, Tuple

from pydantic import BaseModel, Field

from core.config import settings
from services.extractor import (
    extract_all_metadata,
    extract_candidate_name,
    extract_skills_naive,
)
from services.ml_service import VALID_CATEGORIES, ml_service

logger = logging.getLogger(__name__)

EXPERIENCE_LEVELS = [
    "Entry Level (0-2 years)",
    "Mid-Level (3-5 years)",
    "Senior Level (6-10 years)",
    "Executive/Leadership (10+ years)",
]

WORK_MODES = ["Remote", "Hybrid", "On-site", "Flexible"]

AVAILABLE_GEMINI_MODELS = [
    "gemini-4-hydrogen",
    "gemini-3.8-flash",
    "gemini-3.5-flash-lite",
]


class EducationEntry(BaseModel):
    institution: str = ""
    degree: str = ""
    field_of_study: Optional[str] = None
    graduation_year: Optional[str] = None


class RoleEntry(BaseModel):
    title: str = ""
    company: str = ""
    duration: Optional[str] = None
    highlights: List[str] = Field(default_factory=list)


class ResumeAnalysisResult(BaseModel):
    candidate_name: Optional[str] = None
    candidate_email: Optional[str] = None
    role: str = "Generalist"
    primary_industry: str = "INFORMATION-TECHNOLOGY"
    secondary_industry: str = "General"
    confidence_score: float = Field(default=0.75, ge=0.0, le=1.0)
    experience_level: str = "Mid-Level (3-5 years)"
    work_mode: str = "On-site"
    skills: List[str] = Field(default_factory=list)
    education: List[EducationEntry] = Field(default_factory=list)
    previous_roles: List[RoleEntry] = Field(default_factory=list)
    career_summary: str = ""
    redacted_resume_text: str = ""
    is_blind_mode_ready: bool = True


class CandidateMatchEvaluation(BaseModel):
    candidate_id: str
    match_score: int = Field(..., ge=0, le=100)
    matched_skills: List[str] = Field(default_factory=list)
    missing_skills: List[str] = Field(default_factory=list)
    justification: str = ""
    recommended_interview_questions: List[str] = Field(default_factory=list)


class JDMatchEvaluationBatch(BaseModel):
    evaluations: List[CandidateMatchEvaluation] = Field(default_factory=list)


def redact_pii_fallback(text: str, candidate_name: Optional[str] = None) -> str:
    """Deterministic regex fallback for PII redaction when LLM is unavailable."""
    redacted = text
    redacted = re.sub(
        r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b",
        "[REDACTED_EMAIL]",
        redacted,
    )
    redacted = re.sub(
        r"(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})",
        "[REDACTED_PHONE]",
        redacted,
    )
    redacted = re.sub(
        r"https?://(?:www\.)?(?:linkedin\.com|github\.com)/\S+",
        "[REDACTED_PROFILE_URL]",
        redacted,
        flags=re.IGNORECASE,
    )
    if candidate_name and candidate_name not in ("Unknown Candidate", ""):
        for part in candidate_name.split():
            if len(part) >= 3:
                redacted = re.sub(
                    rf"\b{re.escape(part)}\b",
                    "[REDACTED_NAME]",
                    redacted,
                    flags=re.IGNORECASE,
                )
    return redacted


class LLMService:
    """
    Handles structured resume extraction, PII bias mitigation, embeddings, and JD evaluation
    via Google Gemini. Supports Zero-Storage BYOK via per-request ephemeral clients.
    """

    def __init__(self) -> None:
        self._client = None
        self._cached_api_key: Optional[str] = None

    def _get_client(self, api_key_override: Optional[str] = None):
        override = (api_key_override or "").strip()
        if override:
            # Zero-storage BYOK: instantiate an ephemeral client for this request only.
            # Never cache or log user-supplied keys.
            from google import genai

            return genai.Client(api_key=override)

        api_key = (settings.GEMINI_API_KEY or "").strip()
        if not api_key:
            return None
        if self._client is None or self._cached_api_key != api_key:
            from google import genai

            self._client = genai.Client(api_key=api_key)
            self._cached_api_key = api_key
        return self._client

    def _generate_with_retry(
        self,
        client,
        contents: str,
        config,
        model_override: Optional[str] = None,
    ):
        """
        Call Gemini generate_content with retry + automatic model failover on transient
        503/429 spikes or unavailable models.
        """
        primary_model = (model_override or "").strip() or settings.GEMINI_MODEL
        candidate_models = [primary_model] + [
            m for m in settings.GEMINI_FALLBACK_MODELS if m != primary_model
        ]
        last_exc = None

        for model_name in candidate_models:
            for attempt in range(2):
                try:
                    return client.models.generate_content(
                        model=model_name,
                        contents=contents,
                        config=config,
                    )
                except Exception as exc:
                    last_exc = exc
                    msg = str(exc)
                    is_transient = (
                        "503" in msg
                        or "429" in msg
                        or "UNAVAILABLE" in msg
                        or "RESOURCE_EXHAUSTED" in msg
                    )
                    is_not_found = "404" in msg or "NOT_FOUND" in msg or "limit: 0" in msg
                    if is_transient and not is_not_found and attempt == 0:
                        logger.warning(
                            "Gemini model %s transient error, retrying in 1.0s.",
                            model_name,
                        )
                        time.sleep(1.0)
                        continue
                    if is_transient or is_not_found:
                        logger.warning(
                            "Gemini model %s unavailable; failing over to next model.",
                            model_name,
                        )
                        break
                    raise

        raise last_exc

    def verify_api_key(
        self,
        api_key_override: Optional[str] = None,
        model_override: Optional[str] = None,
    ) -> Tuple[bool, int, str]:
        """
        Verify connectivity for either a BYOK key or the managed server key using a
        lightweight embedding probe. Returns (valid, embedding_dims, detail_message).
        """
        client = self._get_client(api_key_override=api_key_override)
        if client is None:
            return False, 0, "No Gemini API key configured."

        from google.genai import types

        try:
            result = client.models.embed_content(
                model=settings.GEMINI_EMBEDDING_MODEL,
                contents="Strata AI connectivity verification probe",
                config=types.EmbedContentConfig(
                    task_type="RETRIEVAL_QUERY",
                    output_dimensionality=settings.EMBEDDING_DIMENSIONS,
                ),
            )
            dims = (
                len(result.embeddings[0].values)
                if result and getattr(result, "embeddings", None)
                else 0
            )
            if dims > 0:
                target_model = (model_override or "").strip() or settings.GEMINI_MODEL
                return True, dims, f"Verified ({settings.GEMINI_EMBEDDING_MODEL} · {dims}d, model {target_model})"
            return False, 0, "Embedding probe returned empty vector."
        except Exception as exc:
            # Avoid leaking full raw headers/keys in error messages
            msg = str(exc)
            if "API_KEY_INVALID" in msg or "400" in msg or "403" in msg:
                return False, 0, "Invalid or unauthorized Gemini API key."
            return False, 0, f"Connection check failed: {msg[:160]}"

    def analyze_resume(
        self,
        resume_text: str,
        filename: str = "resume.pdf",
        api_key_override: Optional[str] = None,
        model_override: Optional[str] = None,
    ) -> ResumeAnalysisResult:
        """Extract structured metadata + PII-redacted blind profile via Gemini, with fallback."""
        client = self._get_client(api_key_override=api_key_override)
        if client is None:
            logger.warning("GEMINI_API_KEY not configured; using heuristic fallback.")
            return self._fallback_analysis(resume_text, filename)

        from google.genai import types

        trimmed_text = resume_text[:24000]
        prompt = (
            "You are an enterprise HR talent intelligence and bias-mitigation engine.\n"
            "Analyze the following resume and return structured JSON matching the schema.\n\n"
            "Rules:\n"
            f"1. primary_industry MUST be one of: {', '.join(VALID_CATEGORIES)}.\n"
            "2. confidence_score MUST be a float between 0.0 and 1.0 reflecting classification certainty.\n"
            f"3. experience_level MUST be one of: {', '.join(EXPERIENCE_LEVELS)}.\n"
            f"4. work_mode MUST be one of: {', '.join(WORK_MODES)}.\n"
            "5. skills: normalized list of concise technical/domain skills (max 25).\n"
            "6. career_summary: 2-3 objective sentences WITHOUT mentioning the candidate's name, gender, age, or school name.\n"
            "7. redacted_resume_text: reproduce the full resume text with ALL PII replaced:\n"
            "   - Candidate full name -> [REDACTED_NAME]\n"
            "   - Emails -> [REDACTED_EMAIL]\n"
            "   - Phone numbers -> [REDACTED_PHONE]\n"
            "   - Home address / city / zip -> [REDACTED_LOCATION]\n"
            "   - LinkedIn/GitHub/personal URLs -> [REDACTED_LINK]\n"
            "   - University/college/school names -> [REDACTED_INSTITUTION]\n\n"
            f"Resume filename: {filename}\n"
            f"Resume text:\n{trimmed_text}"
        )

        try:
            response = self._generate_with_retry(
                client,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=ResumeAnalysisResult,
                    temperature=0.1,
                ),
                model_override=model_override,
            )
            parsed = getattr(response, "parsed", None)
            if isinstance(parsed, ResumeAnalysisResult):
                result = parsed
            else:
                raw_json = json.loads(response.text)
                result = ResumeAnalysisResult.model_validate(raw_json)

            if result.primary_industry not in VALID_CATEGORIES:
                result.primary_industry = ml_service.predict_industry(resume_text)
            if not result.redacted_resume_text.strip():
                result.redacted_resume_text = redact_pii_fallback(
                    resume_text, result.candidate_name
                )
            result.is_blind_mode_ready = True
            return result
        except Exception as exc:
            logger.error("Gemini structured extraction failed (%s); falling back.", exc)
            return self._fallback_analysis(resume_text, filename)

    def generate_embedding(
        self,
        text: str,
        task_type: str = "RETRIEVAL_DOCUMENT",
        api_key_override: Optional[str] = None,
    ) -> Optional[List[float]]:
        """Generate a dense embedding vector for pgvector similarity search."""
        client = self._get_client(api_key_override=api_key_override)
        if client is None or not text.strip():
            return None

        from google.genai import types

        try:
            result = client.models.embed_content(
                model=settings.GEMINI_EMBEDDING_MODEL,
                contents=text[:12000],
                config=types.EmbedContentConfig(
                    task_type=task_type,
                    output_dimensionality=settings.EMBEDDING_DIMENSIONS,
                ),
            )
            if result and getattr(result, "embeddings", None):
                values = result.embeddings[0].values
                return list(values) if values is not None else None
        except Exception as exc:
            logger.error("Gemini embedding generation failed: %s", exc)
        return None

    @staticmethod
    def build_embedding_document(
        analysis: ResumeAnalysisResult,
        fallback_text: str,
    ) -> str:
        """Build a clean, PII-free semantic document for vector indexing."""
        parts = [
            f"Role: {analysis.role}",
            f"Industry: {analysis.primary_industry} / {analysis.secondary_industry}",
            f"Experience: {analysis.experience_level}",
            f"Work Mode: {analysis.work_mode}",
            f"Skills: {', '.join(analysis.skills)}",
        ]
        if analysis.career_summary:
            parts.append(f"Summary: {analysis.career_summary}")
        body = analysis.redacted_resume_text or fallback_text
        if body:
            parts.append(body[:8000])
        return "\n".join(parts)

    def evaluate_jd_matches(
        self,
        job_description: str,
        candidates_payload: List[dict],
        job_title: Optional[str] = None,
        api_key_override: Optional[str] = None,
        model_override: Optional[str] = None,
    ) -> Tuple[List[CandidateMatchEvaluation], str]:
        """
        Stage 2 of RAG matching: re-rank top-K anonymized candidates against a Job Description,
        producing a 0-100 match score, matched/missing skills, justification, and interview questions.
        """
        if not candidates_payload:
            return [], "heuristic_fallback"

        client = self._get_client(api_key_override=api_key_override)
        if client is None:
            return self._fallback_jd_evaluation(job_description, candidates_payload), "heuristic_fallback"

        from google.genai import types

        prompt = (
            "You are an objective, unbiased enterprise technical recruiter AI.\n"
            "Evaluate each anonymized candidate below against the target Job Description.\n\n"
            "Rules:\n"
            "1. Return one evaluation object per candidate_id provided.\n"
            "2. match_score MUST be an integer from 0 to 100.\n"
            "3. matched_skills: specific skills/technologies from the JD that the candidate clearly demonstrates.\n"
            "4. missing_skills: key requirements from the JD that are missing or weak in the candidate's profile.\n"
            "5. justification: 2-3 concise, evidence-based sentences explaining the score without using personal names.\n"
            "6. recommended_interview_questions: 2 targeted interview questions to probe strengths or skill gaps.\n\n"
            f"Target Job Title: {job_title or 'Not specified'}\n"
            f"Job Description:\n{job_description[:6000]}\n\n"
            f"Anonymized Candidates (JSON):\n{json.dumps(candidates_payload, ensure_ascii=False)}"
        )

        try:
            response = self._generate_with_retry(
                client,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=JDMatchEvaluationBatch,
                    temperature=0.15,
                ),
                model_override=model_override,
            )
            parsed = getattr(response, "parsed", None)
            if isinstance(parsed, JDMatchEvaluationBatch):
                batch = parsed
            else:
                batch = JDMatchEvaluationBatch.model_validate(json.loads(response.text))

            if batch.evaluations:
                return batch.evaluations, "gemini_agent"
        except Exception as exc:
            logger.error("Gemini JD evaluation failed (%s); using heuristic fallback.", exc)

        return self._fallback_jd_evaluation(job_description, candidates_payload), "heuristic_fallback"

    @staticmethod
    def _fallback_jd_evaluation(
        job_description: str,
        candidates_payload: List[dict],
    ) -> List[CandidateMatchEvaluation]:
        jd_lower = job_description.lower()
        jd_words = set(re.findall(r"[a-zA-Z0-9+#.]{3,}", jd_lower))
        evaluations: List[CandidateMatchEvaluation] = []

        for item in candidates_payload:
            skills = item.get("skills") or []
            matched = [s for s in skills if s.lower() in jd_lower]
            cand_text = (
                f"{item.get('role', '')} {item.get('career_summary', '')} "
                f"{item.get('redacted_excerpt', '')}"
            ).lower()
            common_tech = [
                "python", "fastapi", "react", "typescript", "postgresql", "pgvector",
                "aws", "docker", "kubernetes", "sql", "machine learning", "finance",
                "excel", "node.js", "java", "go", "terraform", "redis",
            ]
            missing = [
                kw.title()
                for kw in common_tech
                if kw in jd_lower and kw not in cand_text and kw not in [m.lower() for m in matched]
            ][:5]

            vector_sim = float(item.get("vector_similarity") or 0.0)
            skill_bonus = min(20, len(matched) * 6)
            overlap = len(jd_words.intersection(set(re.findall(r"[a-zA-Z0-9+#.]{3,}", cand_text))))
            lexical_score = min(100, int((overlap / max(len(jd_words), 1)) * 120))
            base_score = int(vector_sim * 80) + skill_bonus if vector_sim > 0 else lexical_score
            match_score = max(15, min(98, base_score))

            justification = (
                f"Candidate shows alignment in {item.get('primary_industry', 'the target domain')} "
                f"({item.get('experience_level', 'experience unspecified')})"
                + (f" with matching skills including {', '.join(matched[:4])}." if matched else ".")
                + (f" Key areas to validate: {', '.join(missing[:3])}." if missing else "")
            )
            questions = [
                f"Can you walk through a recent production project utilizing {matched[0] if matched else 'your core stack'}?",
                f"How have you approached {missing[0] if missing else 'scaling and reliability'} in past roles?",
            ]
            evaluations.append(
                CandidateMatchEvaluation(
                    candidate_id=item["candidate_id"],
                    match_score=match_score,
                    matched_skills=matched,
                    missing_skills=missing,
                    justification=justification,
                    recommended_interview_questions=questions,
                )
            )
        return evaluations

    def _fallback_analysis(self, resume_text: str, filename: str) -> ResumeAnalysisResult:
        primary_industry = ml_service.predict_industry(resume_text)
        metadata = extract_all_metadata(resume_text, primary_industry)
        skills = extract_skills_naive(resume_text)
        name = extract_candidate_name(resume_text, filename)
        secondary = metadata.get("secondary_industry") or f"General {primary_industry}"
        final_role = secondary if "General" not in secondary else primary_industry
        email_match = re.search(
            r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b",
            resume_text,
        )

        return ResumeAnalysisResult(
            candidate_name=name,
            candidate_email=email_match.group(0) if email_match else None,
            role=final_role,
            primary_industry=primary_industry,
            secondary_industry=secondary,
            confidence_score=0.6,
            experience_level=metadata.get("experience_level") or "Mid-Level (3-5 years)",
            work_mode=metadata.get("work_mode") or "On-site",
            skills=skills,
            education=[],
            previous_roles=[],
            career_summary="",
            redacted_resume_text=redact_pii_fallback(resume_text, name),
            is_blind_mode_ready=True,
        )


llm_service = LLMService()
