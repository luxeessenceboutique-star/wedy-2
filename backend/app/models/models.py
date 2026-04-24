"""
SQLAlchemy models — mapped to existing Supabase PostgreSQL tables.
No table creation: use `extend_existing=True` to reflect the schema.
"""
import uuid
from datetime import datetime, date
from typing import List, Optional

from sqlalchemy import (
    Column, String, Text, Boolean, Numeric, Date, DateTime,
    ForeignKey, Index, Enum as SAEnum, ARRAY, func,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.database import Base

# ──────────────────────────────────────────────────────────────────────────────
# ENUMS (must match Supabase)
# ──────────────────────────────────────────────────────────────────────────────
RoleTypeEnum = SAEnum(
    "admin", "hr", "manager", "employee", "intern",
    name="role_type", create_type=False,
)
ProfileTypeEnum = SAEnum(
    "employee", "intern", "candidate",
    name="profile_type", create_type=False,
)
RequestStatusEnum = SAEnum(
    "pending", "approved", "rejected",
    name="request_status", create_type=False,
)
DocumentTypeEnum = SAEnum(
    "contract", "certificate", "leave", "other",
    name="document_type", create_type=False,
)


# ──────────────────────────────────────────────────────────────────────────────
# ROLES
# ──────────────────────────────────────────────────────────────────────────────
class Role(Base):
    __tablename__ = "roles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(RoleTypeEnum, unique=True, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    users = relationship("User", back_populates="role")


# ──────────────────────────────────────────────────────────────────────────────
# USERS
# ──────────────────────────────────────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(Text, unique=True, nullable=False)
    role_id = Column(UUID(as_uuid=True), ForeignKey("roles.id", ondelete="SET NULL"))
    created_at = Column(DateTime, server_default=func.now())

    role = relationship("Role", back_populates="users")
    profile = relationship("Profile", back_populates="user", uselist=False)
    notifications = relationship("Notification", back_populates="user")
    cv_uploads = relationship("CVUpload", back_populates="uploader")
    audit_logs = relationship("AuditLog", back_populates="user")


# ──────────────────────────────────────────────────────────────────────────────
# DEPARTMENTS
# ──────────────────────────────────────────────────────────────────────────────
class Department(Base):
    __tablename__ = "departments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    positions = relationship("Position", back_populates="department")


# ──────────────────────────────────────────────────────────────────────────────
# POSITIONS
# ──────────────────────────────────────────────────────────────────────────────
class Position(Base):
    __tablename__ = "positions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(Text, nullable=False)
    department_id = Column(UUID(as_uuid=True), ForeignKey("departments.id", ondelete="SET NULL"))
    created_at = Column(DateTime, server_default=func.now())

    department = relationship("Department", back_populates="positions")
    employees = relationship("Employee", back_populates="position")


# ──────────────────────────────────────────────────────────────────────────────
# PROFILES
# ──────────────────────────────────────────────────────────────────────────────
class Profile(Base):
    __tablename__ = "profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    type = Column(ProfileTypeEnum, nullable=False)
    first_name = Column(Text)
    last_name = Column(Text)
    email = Column(Text)
    phone = Column(Text)
    cin = Column(Text)
    address = Column(Text)
    photo_url = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="profile")
    employee = relationship("Employee", back_populates="profile", uselist=False)
    intern = relationship("Intern", back_populates="profile", uselist=False)
    documents = relationship("Document", back_populates="profile")
    generated_documents = relationship("GeneratedDocument", back_populates="profile")
    hr_requests = relationship("HRRequest", back_populates="profile")

    __table_args__ = (
        Index("idx_profiles_email", "email"),
    )


# ──────────────────────────────────────────────────────────────────────────────
# EMPLOYEES
# ──────────────────────────────────────────────────────────────────────────────
class Employee(Base):
    __tablename__ = "employees"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    profile_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), unique=True)
    position_id = Column(UUID(as_uuid=True), ForeignKey("positions.id"))
    hire_date = Column(Date)
    salary = Column(Numeric)
    status = Column(Text)
    created_at = Column(DateTime, server_default=func.now())

    profile = relationship("Profile", back_populates="employee")
    position = relationship("Position", back_populates="employees")


# ──────────────────────────────────────────────────────────────────────────────
# INTERNS
# ──────────────────────────────────────────────────────────────────────────────
class Intern(Base):
    __tablename__ = "interns"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    profile_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), unique=True)
    school = Column(Text)
    internship_start = Column(Date)
    internship_end = Column(Date)
    supervisor = Column(Text)
    created_at = Column(DateTime, server_default=func.now())

    profile = relationship("Profile", back_populates="intern")


# ──────────────────────────────────────────────────────────────────────────────
# DOCUMENTS
# ──────────────────────────────────────────────────────────────────────────────
class Document(Base):
    __tablename__ = "documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    profile_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"))
    type = Column(DocumentTypeEnum)
    name = Column(Text)
    file_url = Column(Text)
    created_at = Column(DateTime, server_default=func.now())

    profile = relationship("Profile", back_populates="documents")

    __table_args__ = (
        Index("idx_documents_profile", "profile_id"),
    )


# ──────────────────────────────────────────────────────────────────────────────
# DOCUMENT TEMPLATES
# ──────────────────────────────────────────────────────────────────────────────
class DocumentTemplate(Base):
    __tablename__ = "document_templates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(Text, nullable=False)
    type = Column(DocumentTypeEnum)
    content = Column(Text, nullable=False)  # HTML with {{variables}}
    created_at = Column(DateTime, server_default=func.now())

    generated_documents = relationship("GeneratedDocument", back_populates="template")


# ──────────────────────────────────────────────────────────────────────────────
# GENERATED DOCUMENTS
# ──────────────────────────────────────────────────────────────────────────────
class GeneratedDocument(Base):
    __tablename__ = "generated_documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    template_id = Column(UUID(as_uuid=True), ForeignKey("document_templates.id"))
    profile_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id"))
    file_url = Column(Text)
    created_at = Column(DateTime, server_default=func.now())

    template = relationship("DocumentTemplate", back_populates="generated_documents")
    profile = relationship("Profile", back_populates="generated_documents")


# ──────────────────────────────────────────────────────────────────────────────
# HR REQUESTS
# ──────────────────────────────────────────────────────────────────────────────
class HRRequest(Base):
    __tablename__ = "hr_requests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    profile_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"))
    type = Column(Text)
    status = Column(RequestStatusEnum, default="pending")
    comment = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    profile = relationship("Profile", back_populates="hr_requests")

    __table_args__ = (
        Index("idx_requests_profile", "profile_id"),
    )


# ──────────────────────────────────────────────────────────────────────────────
# CV UPLOADS
# ──────────────────────────────────────────────────────────────────────────────
class CVUpload(Base):
    __tablename__ = "cv_uploads"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    file_url = Column(Text)
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at = Column(DateTime, server_default=func.now())

    uploader = relationship("User", back_populates="cv_uploads")
    extraction = relationship("CVExtraction", back_populates="cv", uselist=False)


# ──────────────────────────────────────────────────────────────────────────────
# CV EXTRACTIONS (AI)
# ──────────────────────────────────────────────────────────────────────────────
class CVExtraction(Base):
    __tablename__ = "cv_extractions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cv_id = Column(UUID(as_uuid=True), ForeignKey("cv_uploads.id", ondelete="CASCADE"))
    full_name = Column(Text)
    email = Column(Text)
    phone = Column(Text)
    skills = Column(ARRAY(Text))
    education = Column(Text)
    experience = Column(Text)
    languages = Column(ARRAY(Text))
    raw_json = Column(JSONB)
    created_at = Column(DateTime, server_default=func.now())

    cv = relationship("CVUpload", back_populates="extraction")

    __table_args__ = (
        Index("idx_cv_extractions_cv", "cv_id"),
    )


# ──────────────────────────────────────────────────────────────────────────────
# NOTIFICATIONS
# ──────────────────────────────────────────────────────────────────────────────
class Notification(Base):
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    message = Column(Text)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User", back_populates="notifications")


# ──────────────────────────────────────────────────────────────────────────────
# AUDIT LOGS
# ──────────────────────────────────────────────────────────────────────────────
class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    action = Column(Text)
    entity = Column(Text)
    entity_id = Column(UUID(as_uuid=True))
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User", back_populates="audit_logs")
