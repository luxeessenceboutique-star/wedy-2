"""Pydantic schemas — CV Parsing"""
from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime


class CVUploadOut(BaseModel):
    id: UUID
    file_url: Optional[str] = None
    uploaded_by: Optional[UUID] = None
    created_at: datetime

    class Config:
        from_attributes = True


class CVExtractionOut(BaseModel):
    id: UUID
    cv_id: UUID
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    skills: Optional[List[str]] = None
    education: Optional[str] = None
    experience: Optional[str] = None
    languages: Optional[List[str]] = None
    raw_json: Optional[dict] = None
    created_at: datetime

    class Config:
        from_attributes = True


class CVParseResponse(BaseModel):
    cv_upload: CVUploadOut
    extraction: Optional[CVExtractionOut] = None
    profile_suggestion: Optional[dict] = None
