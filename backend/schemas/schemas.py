from pydantic import BaseModel, EmailStr
from typing import List, Optional

class CandidateBase(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    primary_industry: Optional[str] = None
    secondary_industry: Optional[str] = None
    experience_level: Optional[str] = None
    work_mode: Optional[str] = None
    resume_text: Optional[str] = None
    skills: List[str] = []

class CandidateCreate(CandidateBase):
    pass

class CandidateResponse(CandidateBase):
    id: str

    class Config:
        from_attributes = True

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class ProcessedResumeResponse(BaseModel):
    filename: str
    status: str
    candidate_id: Optional[str] = None
    error: Optional[str] = None
