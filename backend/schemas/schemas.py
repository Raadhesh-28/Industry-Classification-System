from datetime import datetime
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field


# --- Auth Schemas ---

class UserRegisterRequest(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=120)
    password: str = Field(..., min_length=8, max_length=72)
    role: Literal["recruiter", "hiring_manager"] = "recruiter"


class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=72)


class UserResponse(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    role: str
    is_active: bool
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# --- Candidate Schemas ---

class CandidateBase(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    primary_industry: Optional[str] = None
    secondary_industry: Optional[str] = None
    confidence_score: Optional[float] = None
    experience_level: Optional[str] = None
    work_mode: Optional[str] = None
    resume_text: Optional[str] = None
    redacted_resume_text: Optional[str] = None
    is_blind_mode_ready: bool = False
    skills: List[str] = Field(default_factory=list)
    education: List[Dict[str, Any]] = Field(default_factory=list)
    previous_roles: List[Dict[str, Any]] = Field(default_factory=list)
    career_summary: Optional[str] = None


class CandidateCreate(CandidateBase):
    pass


class CandidateResponse(CandidateBase):
    id: str
    uploaded_by_id: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ProcessedResumeResponse(BaseModel):
    filename: str
    status: str
    candidate_id: Optional[str] = None
    error: Optional[str] = None


# --- Semantic Search & Agentic JD Matching Schemas ---

class SemanticSearchResultItem(BaseModel):
    candidate: CandidateResponse
    similarity_score: float = Field(..., ge=0.0, le=1.0)


class SemanticSearchResponse(BaseModel):
    query: str
    search_mode: Literal["vector", "keyword_fallback"]
    blind_mode: bool
    total: int
    results: List[SemanticSearchResultItem] = Field(default_factory=list)


class JDMatchRequest(BaseModel):
    job_title: Optional[str] = Field(default=None, max_length=160)
    job_description: str = Field(..., min_length=20, max_length=12000)
    top_k: int = Field(default=5, ge=1, le=20)
    industry: Optional[str] = None
    experience: Optional[str] = None
    work_mode: Optional[str] = None
    blind_mode: bool = True


class JDMatchResultItem(BaseModel):
    candidate: CandidateResponse
    vector_similarity: float = Field(..., ge=0.0, le=1.0)
    match_score: int = Field(..., ge=0, le=100)
    matched_skills: List[str] = Field(default_factory=list)
    missing_skills: List[str] = Field(default_factory=list)
    justification: str
    recommended_interview_questions: List[str] = Field(default_factory=list)


class JDMatchResponse(BaseModel):
    job_title: Optional[str] = None
    blind_mode: bool
    evaluated_count: int
    search_mode: Literal["vector", "keyword_fallback"]
    evaluation_mode: Literal["gemini_agent", "heuristic_fallback"]
    matches: List[JDMatchResultItem] = Field(default_factory=list)


class ReindexResponse(BaseModel):
    processed: int
    embedded: int
    remaining_without_embeddings: int


# --- Zero-Storage BYOK & AI Settings Schemas ---

class AIStatusResponse(BaseModel):
    active_mode: Literal["byok", "server_default", "heuristic_only"]
    server_default_configured: bool
    active_model: str
    embedding_model: str
    embedding_dimensions: int
    available_models: List[str] = Field(default_factory=list)


class AITestKeyResponse(BaseModel):
    valid: bool
    mode: Literal["byok", "server_default"]
    model: str
    embedding_dimensions: int
    message: str
