from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from app.database import get_db
from app.dependencies import get_current_user
from app import mock_store
import os
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
def list_annonces():
    return mock_store.get_collection("annonces")

@router.get("/{id}", response_model=JobAdOut)
def get_annonce(id: UUID):
    item = mock_store.get_item("annonces", str(id))
    if not item:
        raise HTTPException(status_code=404, detail="Annonce non trouvée")
    return item

@router.post("", response_model=JobAdOut)
def create_annonce(payload: JobAdCreate):
    item = payload.dict()
    item["created_at"] = datetime.now().isoformat()
    db_item = mock_store.add_item("annonces", item)
    
    # Save to history file as requested
    try:
        history_dir = os.path.join("backend", "data", "annonces_history")
        os.makedirs(history_dir, exist_ok=True)
        filename = f"{db_item['id']}_{payload.poste.replace(' ', '_')[:20]}.md"
        with open(os.path.join(history_dir, filename), "w", encoding="utf-8") as f:
            f.write(f"# {payload.poste}\n\n")
            f.write(payload.contenu)
    except:
        pass # Don't block if file saving fails

    return db_item

@router.delete("/{id}")
def delete_annonce(id: UUID):
    mock_store.delete_item("annonces", str(id))
    return {"message": "Annonce supprimée"}

# AI Chat Generation logic
class ChatMessage(BaseModel):
    role: str
    content: str

class ChatGenerateRequest(BaseModel):
    messages: List[ChatMessage]

@router.post("/chat-generate")
async def chat_generate(
    body: ChatGenerateRequest,
    current_user: dict = Depends(get_current_user)
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
