"""Pydantic schemas — Documents & Templates"""
from pydantic import BaseModel
from typing import Optional, Literal
from uuid import UUID
from datetime import datetime


# ── Document ──────────────────────────────────────────────────────────────────
class DocumentCreate(BaseModel):
    profile_id: UUID
    type: Literal["contract", "certificate", "leave", "other"]
    name: str
    file_url: Optional[str] = None


class DocumentOut(BaseModel):
    id: UUID
    profile_id: Optional[UUID] = None  # files added to an employee's folder have no profile
    employee_id: Optional[UUID] = None
    type: Optional[str] = None
    name: Optional[str] = None
    file_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ── Document Template ─────────────────────────────────────────────────────────
class TemplateCreate(BaseModel):
    name: str
    type: Literal["contract", "certificate", "leave", "other"]
    content: str  # HTML with {{variables}}


class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    content: Optional[str] = None


class TemplateOut(BaseModel):
    id: UUID
    name: str
    type: Optional[str] = None
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


# ── Generate Document ─────────────────────────────────────────────────────────
class GenerateDocRequest(BaseModel):
    template_id: UUID
    profile_id: UUID
    extra_vars: Optional[dict] = {}  # additional {{vars}} to inject
    output_format: Literal["pdf", "docx"] = "pdf"


class GeneratedDocOut(BaseModel):
    id: UUID
    template_id: Optional[UUID] = None
    employee_id: Optional[UUID] = None
    file_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
