from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from app.database import get_db
from app.dependencies import get_current_user
from app.repositories import annonce_repository
from supabase import Client

router = APIRouter(prefix="/annonces", tags=["Recruitment - Annonces"])


class JobAdBase(BaseModel):
    poste: str
    description: Optional[str] = None
    competences: Optional[str] = None
    experience: Optional[str] = None
    contenu: str
    image_url: Optional[str] = None
    is_active: bool = True


class JobAdCreate(JobAdBase):
    pass


class JobAdOut(JobAdBase):
    id: UUID
    is_active: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


@router.get("", response_model=List[JobAdOut])
def list_annonces(supabase: Client = Depends(get_db)):
    res = annonce_repository.list_annonces(supabase)
    return res.data or []


@router.get("/{id}", response_model=JobAdOut)
def get_annonce(id: UUID, supabase: Client = Depends(get_db)):
    res = annonce_repository.get_annonce(supabase, str(id))
    if not res.data:
        raise HTTPException(status_code=404, detail="Annonce non trouvée")
    return res.data


@router.post("", response_model=JobAdOut)
def create_annonce(
    payload: JobAdCreate,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    res = annonce_repository.create_annonce(supabase, payload.dict())
    if not res.data:
        raise HTTPException(status_code=500, detail="Erreur lors de la création de l'annonce")
    return res.data[0]


@router.patch("/{id}", response_model=JobAdOut)
def update_annonce(
    id: UUID,
    payload: JobAdBase,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    res = annonce_repository.update_annonce(
        supabase, str(id), {**payload.dict(), "updated_at": datetime.now().isoformat()}
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Annonce non trouvée")
    return res.data[0]


@router.delete("/{id}")
def delete_annonce(
    id: UUID,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    annonce_repository.delete_annonce(supabase, str(id))
    return {"message": "Annonce supprimée"}


# ── AI-assisted job-ad generation ────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str
    content: str


class ChatGenerateRequest(BaseModel):
    messages: List[ChatMessage]


@router.post("/chat-generate")
async def chat_generate(
    body: ChatGenerateRequest,
    current_user: dict = Depends(get_current_user),
):
    from app.routers.copilot import _call_ai

    system = """Vous êtes un expert en recrutement RH.
    Votre but est d'aider l'utilisateur à rédiger une annonce de poste perfectionnée.

    Processus :
    1. Si l'utilisateur donne peu d'infos, demandez des précisions (missions, compétences, avantages).
    2. Si les infos sont suffisantes, générez une annonce structurée avec :
       - Titre du poste
       - Présentation de l'entreprise (imaginaire : TYTHON)
       - Vos missions
       - Profil recherché
       - Ce que nous offrons
       - Un bouton d'appel à l'action.

    Répondez toujours en français.
    Si vous générez l'annonce finale, insérez-la dans un bloc de code ou marquez-la clairement.
    """

    messages = [{"role": m.role, "content": m.content} for m in body.messages]

    try:
        reply = _call_ai(system, messages)
        return {"reply": reply}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
