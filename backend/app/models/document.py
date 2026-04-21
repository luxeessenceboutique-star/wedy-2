from pydantic import BaseModel
from typing import Optional, Any
from enum import Enum


class DocCategory(str, Enum):
    attestation = "attestation"
    contrat = "contrat"
    avenant = "avenant"
    certificat = "certificat"
    lettre = "lettre"
    autre = "autre"


class TemplateBase(BaseModel):
    code: str
    name_fr: str
    name_en: str
    name_ar: str
    category: DocCategory = DocCategory.autre
    body_template: str
    variables: list[str] = []
    is_active: bool = True


class TemplateCreate(TemplateBase):
    pass


class TemplateUpdate(BaseModel):
    name_fr: Optional[str] = None
    name_en: Optional[str] = None
    name_ar: Optional[str] = None
    category: Optional[DocCategory] = None
    body_template: Optional[str] = None
    variables: Optional[list[str]] = None
    is_active: Optional[bool] = None


class Template(TemplateBase):
    id: str
    created_at: str
    updated_at: str

    model_config = {"from_attributes": True}


class GenerateDocumentRequest(BaseModel):
    employee_id: str
    template_id: str
    language: str = "fr"
    extra_variables: Optional[dict[str, Any]] = None
    use_ai_enhancement: bool = False


class GeneratedDocument(BaseModel):
    id: str
    employee_id: str
    template_id: Optional[str] = None
    document_type: str
    content: str
    variables_used: dict
    file_url: Optional[str] = None
    language: str
    generated_by: Optional[str] = None
    created_at: str


class AIEnhanceRequest(BaseModel):
    document_content: str
    document_type: str
    language: str = "fr"
    instructions: Optional[str] = None
