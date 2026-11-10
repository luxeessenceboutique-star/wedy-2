"""AI Copilot router — /api/copilot with live DB context"""
import os
from datetime import date, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from supabase import Client

from app.database import get_db
from app.dependencies import get_current_user, require_hr_or_admin
from app.config import settings
from app.repositories import copilot_repository

router = APIRouter(prefix="/copilot", tags=["Copilot"])


class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: List[Message]
    context: Optional[str] = None


SYSTEM_PROMPT = """You are WEDY Copilot, an expert AI HR assistant for a Moroccan company called TYTHON.
You have DIRECT ACCESS to the company's live HR database. The current data is injected below.
Use this data to answer questions precisely with real numbers and names.

You specialize in:
- Moroccan Labour Code (Code du Travail marocain, Loi 65-99)
- HR best practices and document drafting
- Employee management, contracts, leave policies, payroll
- HR analytics and workforce planning

Rules:
- Always answer in the same language as the user's message (French, Arabic, or English)
- When asked about numbers (employees, contracts, leaves...), use the REAL data provided
- Be concise and direct — give exact numbers, names, and dates from the data
- For legal questions, advise consulting a legal expert
"""


def _build_db_context(supabase: Client) -> str:
    """Query the DB and build a rich context string for the AI."""
    today = date.today()
    month_end = (today.replace(day=1) + timedelta(days=32)).replace(day=1) - timedelta(days=1)
    next_30 = today + timedelta(days=30)

    lines = [f"=== LIVE HR DATABASE — {today.isoformat()} ===\n"]

    # ── Employees ────────────────────────────────────────────────
    try:
        emp_res = copilot_repository.list_employees_full_context(supabase)
        employees = emp_res.data or []

        active = [e for e in employees if e.get("status") == "active"]
        inactive = [e for e in employees if e.get("status") == "inactive"]
        interns = [e for e in employees if e.get("status") == "intern"]
        on_leave = [e for e in employees if e.get("status") == "on-leave"]

        lines.append(f"EMPLOYEES OVERVIEW:")
        lines.append(f"  Total: {len(employees)} | Active: {len(active)} | Interns: {len(interns)} | On leave: {len(on_leave)} | Inactive: {len(inactive)}")

        # Contracts expiring this month
        expiring_month = [
            e for e in employees
            if e.get("contract_end") and
            today.isoformat() <= e["contract_end"] <= month_end.isoformat()
        ]
        expiring_30 = [
            e for e in employees
            if e.get("contract_end") and
            today.isoformat() <= e["contract_end"] <= next_30.isoformat()
        ]
        already_expired = [
            e for e in employees
            if e.get("contract_end") and e["contract_end"] < today.isoformat()
        ]

        if expiring_month:
            lines.append(f"\nCONTRACTS EXPIRING THIS MONTH ({len(expiring_month)}):")
            for e in expiring_month:
                lines.append(f"  - {e['full_name']} ({e.get('position','')}) — expires {e['contract_end']} [{e.get('contract_type','')}]")

        if already_expired:
            lines.append(f"\nALREADY EXPIRED CONTRACTS ({len(already_expired)}):")
            for e in already_expired:
                lines.append(f"  - {e['full_name']} ({e.get('position','')}) — expired {e['contract_end']}")

        # Department breakdown
        depts: dict = {}
        for e in employees:
            d = e.get("department") or "Non assigné"
            depts[d] = depts.get(d, 0) + 1
        if depts:
            lines.append(f"\nDEPARTMENTS: " + ", ".join(f"{d}: {n}" for d, n in sorted(depts.items())))

        # Full employee list
        lines.append(f"\nFULL EMPLOYEE LIST ({len(employees)}):")
        for e in employees:
            salary = f"{e['salary']} MAD" if e.get("salary") else "N/A"
            lines.append(
                f"  - {e['full_name']} | {e.get('position','?')} | {e.get('department','?')} | "
                f"{e.get('contract_type','?')} | status:{e.get('status','?')} | "
                f"hired:{e.get('hire_date','?')} | salary:{salary}"
            )
    except Exception as ex:
        lines.append(f"EMPLOYEES: could not load ({ex})")

    # ── Leave requests ───────────────────────────────────────────
    try:
        leave_res = copilot_repository.list_leave_requests_context(supabase)
        leaves = leave_res.data or []

        pending = [l for l in leaves if l.get("status") == "pending"]
        approved = [l for l in leaves if l.get("status") == "approved"]

        lines.append(f"\nLEAVE REQUESTS: {len(leaves)} total | {len(pending)} pending | {len(approved)} approved")
        if pending:
            lines.append(f"PENDING LEAVE REQUESTS ({len(pending)}):")
            for l in pending[:10]:
                lines.append(f"  - employee_id:{l.get('employee_id','')} | {l.get('type','')} | {l.get('start_date','')} → {l.get('end_date','')} ({l.get('days','')} days)")
    except Exception:
        pass

    # ── Payroll ──────────────────────────────────────────────────
    try:
        pay_res = copilot_repository.list_recent_payroll(supabase)
        payroll = pay_res.data or []
        if payroll:
            lines.append(f"\nRECENT PAYROLL: {len(payroll)} records (latest: {payroll[0].get('month')}/{payroll[0].get('year')})")
    except Exception:
        pass

    # ── Templates ────────────────────────────────────────────────
    try:
        tpl_res = copilot_repository.list_active_templates(supabase)
        templates = tpl_res.data or []
        if templates:
            lines.append(f"\nAVAILABLE DOCUMENT TEMPLATES ({len(templates)}): " +
                         ", ".join(t["name_fr"] for t in templates[:15]))
    except Exception:
        pass

    return "\n".join(lines)


def _call_ai(system: str, messages: list) -> str:
    """Call AI with Anthropic or OpenAI fallback."""
    anthropic_key = os.getenv("ANTHROPIC_API_KEY") or getattr(settings, "ANTHROPIC_API_KEY", "")
    if anthropic_key:
        import anthropic as _anthropic
        client = _anthropic.Anthropic(api_key=anthropic_key)
        resp = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1500,
            system=system,
            messages=messages,
        )
        return resp.content[0].text

    openai_key = os.getenv("OPENAI_API_KEY") or getattr(settings, "OPENAI_API_KEY", "")
    if openai_key:
        from openai import OpenAI
        base = os.getenv("OPENAI_BASE_URL") or getattr(settings, "OPENAI_BASE_URL", "") or None
        model = os.getenv("OPENAI_MODEL") or getattr(settings, "OPENAI_MODEL", "gpt-4o-mini")
        if base and not base.rstrip("/").endswith("/v1"):
            base = base.rstrip("/") + "/v1"
        oa = OpenAI(api_key=openai_key, base_url=base)
        full = [{"role": "system", "content": system}] + messages
        resp = oa.chat.completions.create(model=model, messages=full, max_tokens=1500)
        return resp.choices[0].message.content

    raise ValueError("No AI API key configured. Add ANTHROPIC_API_KEY or OPENAI_API_KEY to .env")


@router.post("/chat")
async def chat(
    body: ChatRequest,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),  # the context below holds every employee's file and salary
):
    messages = [{"role": m.role, "content": m.content} for m in body.messages]

    # Build live DB context
    db_context = _build_db_context(supabase)
    system = SYSTEM_PROMPT + "\n\n" + db_context
    if body.context:
        system += "\n\n" + body.context

    try:
        reply = _call_ai(system, messages)
        return {"reply": reply, "usage": {}}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")


@router.post("/summarize-employee")
async def summarize_employee(
    employee_id: str,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    emp_res = copilot_repository.get_employee(supabase, employee_id)
    if not emp_res.data:
        raise HTTPException(status_code=404, detail="Employee not found")

    emp = emp_res.data
    docs_res = copilot_repository.list_employee_generated_documents(supabase, employee_id)
    leaves_res = copilot_repository.list_employee_leave_requests(supabase, employee_id)

    context = (
        f"Employee: {emp.get('full_name')}\n"
        f"Position: {emp.get('position')} — {emp.get('department')}\n"
        f"Contract: {emp.get('contract_type')} since {emp.get('hire_date')}, ends {emp.get('contract_end')}\n"
        f"Status: {emp.get('status')} | Salary: {emp.get('salary')} MAD\n"
        f"Documents generated: {len(docs_res.data or [])} | Leave requests: {len(leaves_res.data or [])}\n"
    )
    try:
        reply = _call_ai(
            SYSTEM_PROMPT,
            [{"role": "user", "content": f"Give a brief professional HR summary for this employee:\n{context}"}]
        )
        return {"summary": reply, "employee": emp}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")


@router.post("/flow")
async def tybot_flow_proxy(payload: dict, current_user: dict = Depends(get_current_user)):
    import httpx
    api_key = os.getenv("TYBOTFLOW_API_KEY") or getattr(settings, "TYBOTFLOW_API_KEY", "")
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.tybot.ma/flow/v1/execute",
                json=payload,
                headers={"Authorization": f"Bearer {api_key}"},
                timeout=30.0,
            )
            return response.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TyBotFlow Proxy error: {str(e)}")


# ── Multi-agent Copilot (LangGraph) ──────────────────────────────────────────────

class AgentRun(BaseModel):
    thread_id: str
    message: Optional[str] = None
    resume: Optional[dict] = None          # {"approve": true | false}: the user's answer to a confirmation card
    lang: str = "fr"
    auto_approve: bool = False             # run changes without asking (deletions always ask)
    history: Optional[List[Message]] = None  # what the browser shows, used when the server no longer has the conversation


@router.post("/agent")
async def agent_run(body: AgentRun, supabase: Client = Depends(get_db), current_user: dict = Depends(require_hr_or_admin)):
    """One turn of the multi-agent Copilot, streamed as Server-Sent Events."""
    from app.agents import service
    if not body.resume and not (body.message or "").strip():
        raise HTTPException(status_code=422, detail="message or resume required")
    if len(body.thread_id) > 80:
        raise HTTPException(status_code=422, detail="thread_id too long")
    gen = service.stream(thread_id=body.thread_id, user=current_user, db=supabase, lang=body.lang, message=body.message, resume=body.resume,
                         auto_approve=body.auto_approve, history=[m.model_dump() for m in (body.history or [])])
    return StreamingResponse(gen, media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive"})


@router.get("/agents")
def agents_info(lang: str = Query("fr"), current_user: dict = Depends(require_hr_or_admin)):
    """The specialists and what they can do (shown in the Copilot page)."""
    from app.agents import graph as _g  # noqa: F401  (registers the tools)
    from app.agents.catalog import AGENTS
    from app.agents.runtime import AGENT_TOOLS, SPECS
    idx = {"fr": 0, "en": 1, "ar": 2}.get(lang, 0)
    out = []
    for name, a in AGENTS.items():
        tools = [{"name": t.name, "label": SPECS[t.name].label[idx], "write": SPECS[t.name].write, "danger": SPECS[t.name].danger} for t in AGENT_TOOLS.get(name, [])]
        out.append({"name": name, "label": a["label"][idx], "examples": [e[idx] for e in a["examples"]], "tools": tools})
    return {"agents": out}
