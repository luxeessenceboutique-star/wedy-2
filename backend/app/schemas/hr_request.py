"""Pydantic schemas — HR Requests"""
from pydantic import BaseModel
from typing import Optional, Literal
from uuid import UUID
from datetime import datetime


class HRRequestCreate(BaseModel):
    profile_id: UUID
    type: str  # leave | document | update | other
    comment: Optional[str] = None


class HRRequestUpdate(BaseModel):
    status: Literal["pending", "approved", "rejected"]
    comment: Optional[str] = None


class HRRequestOut(BaseModel):
    id: UUID
    profile_id: UUID
    type: Optional[str] = None
    status: str
    comment: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
