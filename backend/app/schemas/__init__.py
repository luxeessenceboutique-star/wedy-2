from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, TokenData, UserOut
from app.schemas.profile import (
    ProfileCreate, ProfileUpdate, ProfileOut,
    EmployeeCreate, EmployeeUpdate, EmployeeOut,
    InternCreate, InternUpdate, InternOut,
)
from app.schemas.document import (
    DocumentCreate, DocumentOut,
    TemplateCreate, TemplateUpdate, TemplateOut,
    GenerateDocRequest, GeneratedDocOut,
)
from app.schemas.hr_request import HRRequestCreate, HRRequestUpdate, HRRequestOut
from app.schemas.cv import CVUploadOut, CVExtractionOut, CVParseResponse
from app.schemas.misc import DepartmentCreate, DepartmentOut, PositionCreate, PositionOut, NotificationOut

__all__ = [
    "LoginRequest", "RegisterRequest", "TokenResponse", "TokenData", "UserOut",
    "ProfileCreate", "ProfileUpdate", "ProfileOut",
    "EmployeeCreate", "EmployeeUpdate", "EmployeeOut",
    "InternCreate", "InternUpdate", "InternOut",
    "DocumentCreate", "DocumentOut",
    "TemplateCreate", "TemplateUpdate", "TemplateOut",
    "GenerateDocRequest", "GeneratedDocOut",
    "HRRequestCreate", "HRRequestUpdate", "HRRequestOut",
    "CVUploadOut", "CVExtractionOut", "CVParseResponse",
    "DepartmentCreate", "DepartmentOut", "PositionCreate", "PositionOut",
    "NotificationOut",
]
