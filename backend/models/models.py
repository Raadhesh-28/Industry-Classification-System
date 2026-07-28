from sqlalchemy import Column, String, Text, ARRAY, Integer
from core.database import Base
import uuid

def generate_uuid():
    return str(uuid.uuid4())

class Candidate(Base):
    __tablename__ = "candidates"

    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    name = Column(String, nullable=True)
    role = Column(String, nullable=True)
    email = Column(String, unique=True, index=True, nullable=True)
    primary_industry = Column(String, nullable=True)
    secondary_industry = Column(String, nullable=True)
    experience_level = Column(String, nullable=True)
    work_mode = Column(String, nullable=True)
    resume_text = Column(Text, nullable=True)
    skills = Column(ARRAY(String), default=list)
