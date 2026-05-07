"""Pydantic schemas — Profiles, Employees, Interns"""
from pydantic import BaseModel, EmailStr
from typing import Optional, Literal, Dict, Any
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
    full_name: str
    cin: Optional[str] = None
    matricule: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    position: Optional[str] = None
    department: Optional[str] = None
    status: Optional[str] = "active"
    hire_date: Optional[date] = None
    contract_type: Optional[str] = None
    contract_start: Optional[date] = None
    contract_end: Optional[date] = None
    salary: Optional[float] = None
    birth_date: Optional[date] = None
    address: Optional[str] = None
    city: Optional[str] = None
    nationality: Optional[str] = None
    manager: Optional[str] = None
    cnss_number: Optional[str] = None
    bank_account: Optional[str] = None
    notes: Optional[str] = None
    internship_start: Optional[date] = None
    internship_end: Optional[date] = None
    custom_fields: Optional[Dict[str, Any]] = None


class EmployeeUpdate(BaseModel):
    full_name: Optional[str] = None
    cin: Optional[str] = None
    matricule: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    position: Optional[str] = None
    department: Optional[str] = None
    status: Optional[str] = None
    hire_date: Optional[date] = None
    contract_type: Optional[str] = None
    contract_start: Optional[date] = None
    contract_end: Optional[date] = None
    salary: Optional[float] = None
    birth_date: Optional[date] = None
    address: Optional[str] = None
    city: Optional[str] = None
    nationality: Optional[str] = None
    manager: Optional[str] = None
    cnss_number: Optional[str] = None
    bank_account: Optional[str] = None
    notes: Optional[str] = None
    internship_start: Optional[date] = None
    internship_end: Optional[date] = None
    custom_fields: Optional[Dict[str, Any]] = None


class EmployeeOut(BaseModel):
    id: UUID
    full_name: str
    cin: Optional[str] = None
    matricule: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    position: Optional[str] = None
    department: Optional[str] = None
    status: Optional[str] = "active"
    hire_date: Optional[date] = None
    contract_type: Optional[str] = None
    contract_start: Optional[date] = None
    contract_end: Optional[date] = None
    salary: Optional[float] = None
    birth_date: Optional[date] = None
    address: Optional[str] = None
    city: Optional[str] = None
    nationality: Optional[str] = None
    manager: Optional[str] = None
    cnss_number: Optional[str] = None
    bank_account: Optional[str] = None
    notes: Optional[str] = None
    internship_start: Optional[date] = None
    internship_end: Optional[date] = None
    custom_fields: Optional[Dict[str, Any]] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ── Intern ───────────────────────────────────────────────────────────────────
class InternCreate(BaseModel):
    full_name: str
    cin: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    school: Optional[str] = None
    position: Optional[str] = None
    department: Optional[str] = None
    supervisor: Optional[str] = None
    internship_start: Optional[date] = None
    internship_end: Optional[date] = None
    status: Optional[str] = "active"
    notes: Optional[str] = None


class InternUpdate(BaseModel):
    full_name: Optional[str] = None
    cin: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    school: Optional[str] = None
    position: Optional[str] = None
    department: Optional[str] = None
    supervisor: Optional[str] = None
    internship_start: Optional[date] = None
    internship_end: Optional[date] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class InternOut(BaseModel):
    id: UUID
    full_name: str
    cin: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    school: Optional[str] = None
    position: Optional[str] = None
    department: Optional[str] = None
    supervisor: Optional[str] = None
    internship_start: Optional[date] = None
    internship_end: Optional[date] = None
    status: Optional[str] = "active"
    notes: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
