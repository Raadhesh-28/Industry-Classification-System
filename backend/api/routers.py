from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
from sqlalchemy import or_, and_
import pandas as pd
import io

from core.database import get_db
from models.models import Candidate
from schemas.schemas import CandidateResponse, CandidateCreate, LoginRequest, ProcessedResumeResponse
from services.file_parser import parse_upload_file
from services.extractor import extract_all_metadata, extract_skills_naive, extract_candidate_name
from services.ml_service import ml_service
from services.ml_service import ml_service

router = APIRouter()

@router.post("/auth/login")
def login(request: LoginRequest):
    # MVP Hardcoded authentication
    if request.email == "admin@company.com" and request.password == "password":
        return {"access_token": "fake-jwt-token-123", "token_type": "bearer"}
    raise HTTPException(status_code=401, detail="Invalid Username or Password")


@router.get("/candidates", response_model=List[CandidateResponse])
def get_candidates(
    db: Session = Depends(get_db),
    keyword: Optional[str] = None,
    industry: Optional[str] = None,
    experience: Optional[str] = None,
    work_mode: Optional[str] = None
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
        # Naive keyword matching using ILIKE for resume text
        filters.append(Candidate.resume_text.ilike(search_term))

    if filters:
        query = query.filter(and_(*filters))

    candidates = query.all()
    return candidates


@router.get("/candidates/{candidate_id}", response_model=CandidateResponse)
def get_candidate(candidate_id: str, db: Session = Depends(get_db)):
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return candidate

@router.delete("/candidates/{candidate_id}", status_code=204)
def delete_candidate(candidate_id: str, db: Session = Depends(get_db)):
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    db.delete(candidate)
    db.commit()
    return None

@router.post("/upload", response_model=List[ProcessedResumeResponse])
async def upload_resumes(
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db)
):
    responses = []
    
    for file in files:
        try:
            # 1. Parse file content
            text = await parse_upload_file(file)
            
            if not text.strip():
                responses.append(ProcessedResumeResponse(filename=file.filename, status="Failed", error="No text extracted"))
                continue

            # Check for existing duplicate
            existing_candidate = db.query(Candidate).filter(Candidate.resume_text == text).first()
            if existing_candidate:
                responses.append(ProcessedResumeResponse(
                    filename=file.filename, 
                    status="Skipped (Duplicate)", 
                    candidate_id=existing_candidate.id
                ))
                continue

            # 2. Run ML Service (DistilBERT base classification)
            primary_industry = ml_service.predict_industry(text)

            # 3. Extract Metadata via Regex
            metadata = extract_all_metadata(text, primary_industry)
            
            # 4. Extract dummy skills
            skills = extract_skills_naive(text)

            secondary = metadata.get("secondary_industry")
            final_role = secondary if secondary and "General" not in secondary else primary_industry

            # 5. Populate DB Model
            candidate = Candidate(
                name=extract_candidate_name(text, file.filename),
                role=final_role,
                primary_industry=primary_industry,
                secondary_industry=secondary,
                experience_level=metadata.get("experience_level"),
                work_mode=metadata.get("work_mode"),
                resume_text=text,
                skills=skills
            )

            db.add(candidate)
            db.commit()
            db.refresh(candidate)

            responses.append(ProcessedResumeResponse(
                filename=file.filename,
                status="Success",
                candidate_id=candidate.id
            ))
            
        except Exception as e:
            db.rollback()
            responses.append(ProcessedResumeResponse(
                filename=file.filename,
                status="Failed",
                error=str(e)
            ))

    return responses

@router.post("/seed", response_model=List[ProcessedResumeResponse])
async def seed_csv(file: UploadFile = File(...), db: Session = Depends(get_db)):
    content = await file.read()
    responses = []
    try:
        df = pd.read_csv(io.BytesIO(content))
        if 'Resume_str' not in df.columns:
            raise HTTPException(status_code=400, detail="CSV must contain a 'Resume_str' column")
        
        candidates_to_add = []
        for index, row in df.iterrows():
            text = str(row['Resume_str'])
            
            # Check for existing duplicate
            existing_candidate = db.query(Candidate).filter(Candidate.resume_text == text).first()
            if existing_candidate:
                continue

            if 'Category' in df.columns:
                primary_industry = str(row['Category']).upper().replace(" ", "-")
            else:
                primary_industry = ml_service.predict_industry(text)
            
            metadata = extract_all_metadata(text, primary_industry)
            skills = extract_skills_naive(text)

            secondary = metadata.get("secondary_industry")
            final_role = secondary if secondary and "General" not in secondary else primary_industry

            candidate = Candidate(
                name=extract_candidate_name(text, file.filename),
                role=final_role,
                primary_industry=primary_industry,
                secondary_industry=secondary,
                experience_level=metadata.get("experience_level"),
                work_mode=metadata.get("work_mode"),
                resume_text=text,
                skills=skills
            )
            db.add(candidate)
            # Only processing the first 200 for safe bulk testing purposes if file is massive
            if index > 200:
                break
        
        db.commit()
        responses.append(ProcessedResumeResponse(filename=file.filename, status="Success", candidate_id="seeded_batch"))
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    
    return responses
