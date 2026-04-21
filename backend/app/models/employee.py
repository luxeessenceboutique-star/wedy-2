from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import date
from enum import Enum


class ContractType(str, Enum):
    CDI = "CDI"
    CDD = "CDD"
    Stage = "Stage"
    Freelance = "Freelance"


class EmployeeStatus(str, Enum):
    active = "active"
    inactive = "inactive"
    terminated = "terminated"
    intern = "intern"


class EmployeeBase(BaseModel):
    full_name: str
    cin: Optional[str] = None
    matricule: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    position: Optional[str] = None
    department: Optional[str] = None
    salary: Optional[float] = None
    hire_date: Optional[date] = None
    contract_type: Optional[ContractType] = None
    contract_start: Optional[date] = None
    contract_end: Optional[date] = None
    internship_start: Optional[date] = None
    internship_end: Optional[date] = None
    manager: Optional[str] = None
    status: EmployeeStatus = EmployeeStatus.active
    address: Optional[str] = None
    birth_date: Optional[date] = None
    nationality: Optional[str] = "Marocaine"
    notes: Optional[str] = None


class EmployeeCreate(EmployeeBase):
    pass


class EmployeeUpdate(BaseModel):
    full_name: Optional[str] = None
    cin: Optional[str] = None
    matricule: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    position: Optional[str] = None
    department: Optional[str] = None
    salary: Optional[float] = None
    hire_date: Optional[date] = None
    contract_type: Optional[ContractType] = None
    contract_start: Optional[date] = None
    contract_end: Optional[date] = None
    internship_start: Optional[date] = None
    internship_end: Optional[date] = None
    manager: Optional[str] = None
    status: Optional[EmployeeStatus] = None
    address: Optional[str] = None
    birth_date: Optional[date] = None
    nationality: Optional[str] = None
    notes: Optional[str] = None


class Employee(EmployeeBase):
    id: str
    created_by: Optional[str] = None
    created_at: str
    updated_at: str

    model_config = {"from_attributes": True}
