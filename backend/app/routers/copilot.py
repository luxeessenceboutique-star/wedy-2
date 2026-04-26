"""AI Copilot router — /api/copilot (dedicated Claude chat endpoint)"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from supabase import Client

from app.database import get_db
from app.dependencies import get_current_user
from app.config import settings

router = APIRouter(prefix="/copilot", tags=["Copilot"])


class Message(BaseModel):
    role: str  # user | assistant
    content: str


class ChatRequest(BaseModel):
    messages: List[Message]
    context: Optional[str] = None  # e.g. "employee_data" injected from frontend


SYSTEM_PROMPT = """You are YODABOT Copilot, an expert AI HR assistant for a Moroccan company.
You specialize in:
- Moroccan Labour Code (Code du Travail marocain, Loi 65-99)
- HR best practices and document drafting
- Employee management, contracts, leave policies, payroll
- HR analytics and workforce planning

Always respond in the same language as the user's message (French, Arabic, or English).
Be concise, professional, and practical. When asked about legal matters, always advise consulting a legal expert.
When you suggest a document, mention the relevant template in the system.
"""


@router.post("/chat")
async def chat(
    body: ChatRequest,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    try:
        import anthropic
        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

        # Build messages for Claude
        messages = [{"role": m.role, "content": m.content} for m in body.messages]

        # Optionally inject live company context
        system = SYSTEM_PROMPT
        if body.context:
            system += f"\n\nCurrent context provided by the HR system:\n{body.context}"

        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1024,
            system=system,
            messages=messages,
        )

        reply = response.content[0].text
        return {"reply": reply, "usage": {"input_tokens": response.usage.input_tokens, "output_tokens": response.usage.output_tokens}}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")


@router.post("/summarize-employee")
async def summarize_employee(
    employee_id: str,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Generate an AI summary of an employee's profile and history."""
    emp_res = supabase.table("employees").select("*").eq("id", employee_id).maybe_single().execute()
    if not emp_res.data:
        raise HTTPException(status_code=404, detail="Employee not found")

    emp = emp_res.data
    docs_res = supabase.table("generated_documents").select("document_type, created_at").eq("employee_id", employee_id).execute()
    leaves_res = supabase.table("leave_requests").select("type, days, status, start_date").eq("employee_id", employee_id).execute()

    context = f"""
Employee: {emp.get('full_name')}
Position: {emp.get('position')} — {emp.get('department')}
Contract: {emp.get('contract_type')} since {emp.get('hire_date')}
Status: {emp.get('status')}
Salary: {emp.get('salary')} MAD
Documents generated: {len(docs_res.data or [])}
Leave requests: {len(leaves_res.data or [])} total
"""

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=512,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": f"Give me a brief HR profile summary for this employee:\n{context}"}],
        )
        return {"summary": response.content[0].text, "employee": emp}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")
@router.post("/flow")
async def tybot_flow_proxy(
    payload: dict,
    current_user: dict = Depends(get_current_user),
):
    """Proxy for TyBotFlow API to keep the API key secure on the backend."""
    import httpx
    
    # We use the key from environment/settings
    # If TYBOTFLOW_API_KEY is not set, we'll return an error
    api_key = getattr(settings, "TYBOTFLOW_API_KEY", "missing_key")
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.tybot.ma/flow/v1/execute",
                json=payload,
                headers={"Authorization": f"Bearer {api_key}"},
                timeout=30.0
            )
            return response.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TyBotFlow Proxy error: {str(e)}")
