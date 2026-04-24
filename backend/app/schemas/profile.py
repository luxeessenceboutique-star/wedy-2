"""Pydantic schemas — Profiles, Employees, Interns"""
from pydantic import BaseModel, EmailStr
from typing import Optional, Literal
from uuid import UUID
from datetime import date, datetime


# ── Profile ─────────────────────────────────────────────────────────────────
class ProfileBase(BaseModel):
    type: Literal["employee", "intern", "candidate"]
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    cin: Optional[str] = None
    address: Optional[str] = None
    photo_url: Optional[str] = None


class ProfileCreate(ProfileBase):
    user_id: Optional[UUID] = None


class ProfileUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    cin: Optional[str] = None
    address: Optional[str] = None
    photo_url: Optional[str] = None


class ProfileOut(ProfileBase):
    id: UUID
    user_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ── Employee ─────────────────────────────────────────────────────────────────
class EmployeeCreate(BaseModel):
    profile_id: UUID
    position_id: Optional[UUID] = None
    hire_date: Optional[date] = None
    salary: Optional[float] = None
    status: Optional[str] = "active"


class EmployeeUpdate(BaseModel):
    position_id: Optional[UUID] = None
    hire_date: Optional[date] = None
    salary: Optional[float] = None
    status: Optional[str] = None


class EmployeeOut(BaseModel):
    id: UUID
    profile_id: UUID
    position_id: Optional[UUID] = None
    hire_date: Optional[date] = None
    salary: Optional[float] = None
    status: Optional[str] = None
    created_at: datetime
    profile: Optional[ProfileOut] = None

    class Config:
        from_attributes = True


# ── Intern ───────────────────────────────────────────────────────────────────
class InternCreate(BaseModel):
    profile_id: UUID
    school: Optional[str] = None
    internship_start: Optional[date] = None
    internship_end: Optional[date] = None
    supervisor: Optional[str] = None


class InternUpdate(BaseModel):
    school: Optional[str] = None
    internship_start: Optional[date] = None
    internship_end: Optional[date] = None
    supervisor: Optional[str] = None


class InternOut(BaseModel):
    id: UUID
    profile_id: UUID
    school: Optional[str] = None
    internship_start: Optional[date] = None
    internship_end: Optional[date] = None
    supervisor: Optional[str] = None
    created_at: datetime
    profile: Optional[ProfileOut] = None

    class Config:
        from_attributes = True
