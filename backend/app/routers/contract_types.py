"""Contract Types router — /api/contract-types"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from supabase import Client

from app.database import get_db
from app.dependencies import require_role
from app.repositories import contract_type_repository

router = APIRouter(prefix="/contract-types", tags=["Contract Types"])

_DEFAULTS = [
    {"id": "cdi",       "name": "CDI",       "description": "Contrat à Durée Indéterminée", "is_active": True},
    {"id": "cdd",       "name": "CDD",       "description": "Contrat à Durée Déterminée",  "is_active": True},
    {"id": "stage",     "name": "Stage",     "description": "Convention de stage",          "is_active": True},
    {"id": "freelance", "name": "Freelance", "description": "Contrat de prestation",        "is_active": True},
]


class ContractTypeCreate(BaseModel):
    name: str
    description: Optional[str] = None


class ContractTypeUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


@router.get("", response_model=List[dict])
def list_contract_types(supabase: Client = Depends(get_db)):
    try:
        res = contract_type_repository.list_contract_types(supabase)
        if res.data:
            return res.data
    except Exception:
        pass
    return _DEFAULTS


@router.post("", status_code=201)
def create_contract_type(
    payload: ContractTypeCreate,
    supabase: Client = Depends(get_db),
    _user: dict = Depends(require_role("admin", "hr")),
):
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Le nom est obligatoire")
    try:
        res = contract_type_repository.create_contract_type(supabase, {
            "name": name,
            "description": payload.description.strip() if payload.description else None,
            "is_active": True,
        })
        if res.data:
            return res.data[0]
        raise HTTPException(status_code=400, detail="Impossible de créer le type de contrat")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur base de données : {e}")


@router.patch("/{ct_id}")
def update_contract_type(
    ct_id: str,
    payload: ContractTypeUpdate,
    supabase: Client = Depends(get_db),
    _user: dict = Depends(require_role("admin", "hr")),
):
    data = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not data:
        raise HTTPException(status_code=400, detail="Aucun champ à modifier")
    if "name" in data:
        data["name"] = data["name"].strip()
    try:
        res = contract_type_repository.update_contract_type(supabase, ct_id, data)
        if not res.data:
            raise HTTPException(status_code=404, detail="Type de contrat introuvable")
        return res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur base de données : {e}")


@router.delete("/{ct_id}", status_code=204)
def delete_contract_type(
    ct_id: str,
    supabase: Client = Depends(get_db),
    _user: dict = Depends(require_role("admin", "hr")),
):
    try:
        res = contract_type_repository.delete_contract_type(supabase, ct_id)
        if not res.data:
            raise HTTPException(status_code=404, detail="Type de contrat introuvable")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur base de données : {e}")
