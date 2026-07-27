"""Pydantic schemas for Auth"""
from pydantic import BaseModel, EmailStr
from typing import Optional
from uuid import UUID


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None
    role: str = "employee"  # admin | hr | manager | employee | intern


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: UUID
    email: str
    role: str
    role_name: Optional[str] = None


class TokenData(BaseModel):
    user_id: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None


class UserOut(BaseModel):
    id: UUID
    email: str
    role_name: Optional[str] = None
    role: Optional[str] = None
    full_name: Optional[str] = None
    created_at: Optional[str] = None

    class Config:
        from_attributes = True
