"""Pydantic schemas — Departments & Positions"""
from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime


class DepartmentCreate(BaseModel):
    name: str


class DepartmentOut(BaseModel):
    id: UUID
    name: str
    created_at: datetime

    class Config:
        from_attributes = True


class PositionCreate(BaseModel):
    title: str
    department_id: Optional[UUID] = None


class PositionOut(BaseModel):
    id: UUID
    title: str
    department_id: Optional[UUID] = None
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationOut(BaseModel):
    id: UUID
    user_id: UUID
    message: Optional[str] = None
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True
