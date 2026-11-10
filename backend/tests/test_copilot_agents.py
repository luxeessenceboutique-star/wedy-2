"""Tests of the multi-agent Copilot with a scripted model and a fake database:  python -m pytest backend/tests  (or run this file).

They check the real wiring: routing, tool calls into the route handlers, the confirmation step (interrupt / resume),
refusals, multi-agent chains, name ambiguity, auto-approve and thread ownership."""
import asyncio
import os
import sys
import tempfile
from datetime import date, timedelta

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.dirname(__file__))

import scripted_model as sm  # noqa: E402
from fakedb import FakeDB  # noqa: E402
from langchain_core.messages import AIMessage  # noqa: E402

from app.agents import llm, service  # noqa: E402
from app.config import settings  # noqa: E402

settings.UPLOAD_DIR = tempfile.mkdtemp(prefix="wedy-test-uploads-")  # generated PDFs never land in the real uploads folder
settings.DURABLE_STORAGE = False  # tests must never write to the real Supabase Storage

USER = {"id": "11111111-2222-3333-4444-555555555555", "role_name": "hr", "full_name": "Salma Idrissi", "email": "salma@tython.ma"}
OTHER = {**USER, "id": "99999999-2222-3333-4444-555555555555"}
TOMORROW = (date.today() + timedelta(days=1)).isoformat()
NEXT_WEEK = (date.today() + timedelta(days=7)).isoformat()


def make_db() -> FakeDB:
    db = FakeDB()
    db.tables["employees"] = [
        {"id": "00000000-0000-4000-8000-0000000000e1", "full_name": "Zineb Haddad", "status": "active", "department": "Finance", "position": "Comptable", "email": "zineb@t.ma", "hire_date": "2021-03-01"},
        {"id": "00000000-0000-4000-8000-0000000000e2", "full_name": "Karim Lahlou", "status": "active", "department": "IT", "position": "Dev", "email": "karim.l@t.ma"},
        {"id": "00000000-0000-4000-8000-0000000000e3", "full_name": "Karim Benjelloun", "status": "active", "department": "Marketing", "position": "CM", "email": "karim.b@t.ma"},
        {"id": "00000000-0000-4000-8000-0000000000e4", "full_name": "Omar Bennani", "status": "candidate", "position": "Développeur React", "email": "omar@mail.ma", "custom_fields": {"ad_id": "00000000-0000-4000-8000-0000000000a1", "recruitment_stage": "new"}},
        {"id": "00000000-0000-4000-8000-0000000000e5", "full_name": "Nora Fassi", "status": "intern", "position": "Marketing", "internship_end": (date.today() + timedelta(days=10)).isoformat(), "internship_status": "En cours"},
    ]
    db.tables["leave_requests"] = [{"id": "l1", "employee_id": "00000000-0000-4000-8000-0000000000e1", "type": "annual", "start_date": TOMORROW, "end_date": NEXT_WEEK, "days": 5, "status": "pending"}]
    db.tables["recruitment_ads"] = [{"id": "00000000-0000-4000-8000-0000000000a1", "poste": "Développeur React", "description": "CDI · Casablanca", "contenu": "x", "is_active": True}]
    db.tables["interviews"], db.tables["meetings"], db.tables["audit_logs"], db.tables["holidays"] = [], [], [], []
    return db


def setup():
    sm.reset()
    service.reset_for_tests()
    llm.set_model_override(lambda: sm.ScriptedModel())


async def collect(db, message=None, resume=None, thread="t1", user=USER, auto=False, lang="fr"):
    return [e async for e in service.run(thread_id=thread, user=user, db=db, lang=lang, message=message, resume=resume, auto_approve=auto)]


def run(coro):
    return asyncio.run(coro)


def kinds(evs):
    return [e["t"] for e in evs]


def test_read_only_question_streams_an_answer():
    setup(); db = make_db()
    sm.ROUTES += [{"next": "employees", "instruction": "count active staff"}, {"next": "FINISH"}]
    sm.AGENT += [sm.call("search_employees", {"status": "active"}), AIMessage(content="Il y a 3 employés actifs.")]
    evs = run(collect(db, "Combien d'employés actifs ?"))
    assert kinds(evs)[0] == "run" and kinds(evs)[-1] == "done" and evs[-1]["status"] == "complete"
    assert next(e for e in evs if e["t"] == "route")["agent"] == "employees"
    tr = next(e for e in evs if e["t"] == "tool_result")
    assert tr["ok"] and tr["summary"] == "3", tr
    assert "".join(e["text"] for e in evs if e["t"] == "token") == "Il y a 3 employés actifs."
    assert next(e for e in evs if e["t"] == "message")["text"] == "Il y a 3 employés actifs."
    assert not any(e["t"] == "confirm" for e in evs)


def test_change_asks_for_confirmation_then_runs():
    setup(); db = make_db()
    sm.ROUTES += [{"next": "leave", "instruction": "approve Zineb's leave"}, {"next": "FINISH"}]
    sm.AGENT += [sm.call("review_leave", {"decision": "approved", "employee": "Zineb"}), AIMessage(content="Congé approuvé.")]
    evs = run(collect(db, "Approuve le congé de Zineb"))
    conf = [e for e in evs if e["t"] == "confirm"]
    assert len(conf) == 1 and evs[-1]["status"] == "awaiting_confirmation"
    assert "Zineb Haddad" in conf[0]["summary"] and not conf[0]["danger"]
    assert db.tables["leave_requests"][0]["status"] == "pending", "nothing may change before the user confirms"
    evs2 = run(collect(db, resume={"approve": True}))
    assert db.tables["leave_requests"][0]["status"] == "approved"
    assert any(e["t"] == "tool_result" and e["ok"] for e in evs2) and evs2[-1]["status"] == "complete"
    assert next(e for e in evs2 if e["t"] == "message")["text"] == "Congé approuvé."
    assert any(r.get("action") == "APPROVED" for r in db.tables["audit_logs"]), "the page's audit trail must be written"


def test_refusal_changes_nothing():
    setup(); db = make_db()
    sm.ROUTES += [{"next": "leave"}, {"next": "FINISH"}]
    sm.AGENT += [sm.call("review_leave", {"decision": "rejected", "employee": "Zineb"}), AIMessage(content="D'accord, je ne refuse pas ce congé.")]
    run(collect(db, "Refuse le congé de Zineb"))
    evs = run(collect(db, resume={"approve": False}))
    assert db.tables["leave_requests"][0]["status"] == "pending"
    tr = next(e for e in evs if e["t"] == "tool_result")
    assert tr["ok"] is False and tr["summary"] == "cancelled"
    assert evs[-1]["status"] == "complete"


def test_ambiguous_name_is_reported_to_the_agent_not_guessed():
    setup(); db = make_db()
    sm.ROUTES += [{"next": "leave"}, {"next": "FINISH"}]
    sm.AGENT += [sm.call("leave_balance", {"employee": "Karim"}), AIMessage(content="Quel Karim : Lahlou ou Benjelloun ?")]
    evs = run(collect(db, "Quel est le solde de Karim ?"))
    tr = next(e for e in evs if e["t"] == "tool_result")
    assert tr["ok"] is False and "Plusieurs" in tr["summary"] and "Lahlou" in tr["summary"]


def test_two_specialists_in_one_request():
    setup(); db = make_db()
    sm.ROUTES += [{"next": "leave", "instruction": "approve"}, {"next": "recruitment", "instruction": "move Omar to interview"}, {"next": "FINISH"}]
    sm.AGENT += [sm.call("review_leave", {"decision": "approved", "employee": "Zineb"}), AIMessage(content="Congé approuvé."),
                 sm.call("move_candidate", {"candidate": "Omar", "stage": "interview"}), AIMessage(content="Omar passe à l'entretien.")]
    e1 = run(collect(db, "Approuve le congé de Zineb et passe Omar en entretien"))
    assert e1[-1]["status"] == "awaiting_confirmation"
    e2 = run(collect(db, resume={"approve": True}))
    assert [e["agent"] for e in e2 if e["t"] == "route"] == ["recruitment"]
    assert e2[-1]["status"] == "awaiting_confirmation" and [e for e in e2 if e["t"] == "confirm"][0]["tool"] == "move_candidate"
    e3 = run(collect(db, resume={"approve": True}))
    assert e3[-1]["status"] == "complete"
    assert db.tables["leave_requests"][0]["status"] == "approved"
    assert next(r for r in db.tables["employees"] if r["id"] == "00000000-0000-4000-8000-0000000000e4")["custom_fields"]["recruitment_stage"] == "interview"
    assert [e["text"] for e in e1 + e2 + e3 if e["t"] == "message"] == ["Congé approuvé.", "Omar passe à l'entretien."]


def test_auto_approve_skips_confirmation_but_never_for_deletions():
    setup(); db = make_db()
    sm.ROUTES += [{"next": "leave"}, {"next": "FINISH"}]
    sm.AGENT += [sm.call("review_leave", {"decision": "approved", "employee": "Zineb"}), AIMessage(content="Fait.")]
    evs = run(collect(db, "Approuve", auto=True))
    assert not any(e["t"] == "confirm" for e in evs) and db.tables["leave_requests"][0]["status"] == "approved"
    setup(); db = make_db()
    sm.ROUTES += [{"next": "employees"}, {"next": "FINISH"}]
    sm.AGENT += [sm.call("delete_employee", {"employee": "Karim Lahlou"}), AIMessage(content="Supprimé.")]
    evs = run(collect(db, "Supprime Karim Lahlou", auto=True))
    conf = [e for e in evs if e["t"] == "confirm"]
    assert len(conf) == 1 and conf[0]["danger"] is True and len(db.tables["employees"]) == 5


def test_schedule_interview_builds_meeting_and_moves_candidate():
    setup(); db = make_db()
    sm.ROUTES += [{"next": "recruitment"}, {"next": "FINISH"}]
    sm.AGENT += [sm.call("schedule_interview", {"candidate": "Omar", "date": TOMORROW, "start_time": "10:00", "type": "technical", "interviewers": "Zineb"}), AIMessage(content="Entretien planifié.")]
    e1 = run(collect(db, "Planifie un entretien avec Omar demain à 10h"))
    conf = next(e for e in e1 if e["t"] == "confirm")
    assert "Omar Bennani" in conf["summary"] and any("10:00 – 11:00" in str(d[1]) for d in conf["details"])
    run(collect(db, resume={"approve": True}))
    iv = db.tables["interviews"][0]
    assert iv["start_time"] == "10:00" and iv["end_time"] == "11:00" and iv["type"] == "technical"
    meeting = db.tables["meetings"][0]
    assert meeting["kind"] == "int" and meeting["starts_at"].startswith(TOMORROW) and meeting["duration_min"] == 60
    assert next(r for r in db.tables["employees"] if r["id"] == "00000000-0000-4000-8000-0000000000e4")["custom_fields"]["recruitment_stage"] == "interview"


def test_create_and_update_employee_and_leave_request():
    setup(); db = make_db()
    sm.ROUTES += [{"next": "employees"}, {"next": "leave"}, {"next": "FINISH"}]
    sm.AGENT += [sm.call("create_employee", {"full_name": "Hajar Benali", "position": "RH", "department": "RH", "contract_type": "CDI", "salary": 9000}), AIMessage(content="Hajar créée."),
                 sm.call("request_leave", {"employee": "Hajar", "start_date": TOMORROW, "end_date": NEXT_WEEK, "type": "annual"}), AIMessage(content="Demande créée.")]
    run(collect(db, "Crée Hajar Benali (RH, CDI, 9000) puis un congé pour elle"))
    run(collect(db, resume={"approve": True}))
    ev = run(collect(db, resume={"approve": True}))
    h = next(r for r in db.tables["employees"] if r["full_name"] == "Hajar Benali")
    assert h["status"] == "active" and h["salary"] == 9000
    lv = [r for r in db.tables["leave_requests"] if r["employee_id"] == h["id"]]
    assert len(lv) == 1 and lv[0]["status"] == "pending" and 1 <= lv[0]["days"] <= 6
    assert ev[-1]["status"] == "complete"


def test_supervisor_failure_falls_back_to_keyword_routing():
    setup(); db = make_db()
    sm.ROUTES += [RuntimeError("router down"), RuntimeError("router down")]
    sm.AGENT += [sm.call("search_employees", {"query": "Zineb"}), AIMessage(content="Zineb est comptable.")]
    evs = run(collect(db, "Trouve l'employé Zineb"))
    assert next(e for e in evs if e["t"] == "route")["agent"] == "employees"
    assert next(e for e in evs if e["t"] == "message")["text"] == "Zineb est comptable."


def test_a_conversation_belongs_to_its_user():
    setup(); db = make_db()
    sm.ROUTES += [{"next": "general"}, {"next": "FINISH"}]
    sm.AGENT += [AIMessage(content="Bonjour")]
    run(collect(db, "Bonjour"))
    evs = run(collect(db, "Hello", user=OTHER))
    assert evs[0]["t"] == "error" and evs[0]["code"] == "forbidden"


def test_follow_up_keeps_memory():
    setup(); db = make_db()
    sm.ROUTES += [{"next": "general"}, {"next": "FINISH"}, {"next": "general"}, {"next": "FINISH"}]
    sm.AGENT += [AIMessage(content="Bonjour Salma."), AIMessage(content="Vous m'avez dit bonjour.")]
    run(collect(db, "Bonjour, je suis Salma"))
    run(collect(db, "Que t'ai-je dit ?"))
    last_agent_call = [m for k, m in sm.LOG if k == "agent"][-1]
    assert any("Je suis Salma" in str(getattr(x, "content", "")) or "je suis Salma" in str(getattr(x, "content", "")) for x in last_agent_call), "history must reach the model"


def test_without_any_ai_key_the_stream_says_so():
    setup(); db = make_db()
    llm.set_model_override(None)
    real = service.provider
    service.provider = lambda: ""
    try:
        evs = run(collect(db, "Bonjour"))
    finally:
        service.provider = real
    assert evs[0]["t"] == "error" and evs[0]["code"] == "no_ai_key"


def test_http_endpoint_is_hr_only_and_streams_sse():
    from fastapi import HTTPException
    from fastapi.testclient import TestClient
    import app.main as m
    from app.database import get_db
    from app.dependencies import require_hr_or_admin
    setup(); db = make_db()
    m.app.dependency_overrides[get_db] = lambda: db
    c = TestClient(m.app)
    def deny():
        raise HTTPException(status_code=403, detail="Permissions insuffisantes")
    m.app.dependency_overrides[require_hr_or_admin] = deny
    assert c.post("/api/copilot/agent", json={"thread_id": "h1", "message": "salut"}).status_code == 403
    assert c.get("/api/copilot/agents").status_code == 403
    m.app.dependency_overrides[require_hr_or_admin] = lambda: USER
    sm.ROUTES += [{"next": "general"}, {"next": "FINISH"}]
    sm.AGENT += [AIMessage(content="Bonjour !")]
    r = c.post("/api/copilot/agent", json={"thread_id": "h1", "message": "salut", "lang": "fr"})
    assert r.status_code == 200 and r.headers["content-type"].startswith("text/event-stream") and r.headers["x-accel-buffering"] == "no"
    import json as _j
    evs = [_j.loads(line[6:]) for line in r.text.splitlines() if line.startswith("data: ")]
    assert [e["t"] for e in evs][0] == "run" and evs[-1] == {"t": "done", "status": "complete"} and any(e["t"] == "message" and e["text"] == "Bonjour !" for e in evs)
    assert c.post("/api/copilot/agent", json={"thread_id": "h1"}).status_code == 422
    info = c.get("/api/copilot/agents?lang=en").json()["agents"]
    assert {a["name"] for a in info} >= {"employees", "leave", "recruitment", "documents", "talent", "analytics", "comms", "general"}
    assert any(t["write"] for a in info for t in a["tools"])
    m.app.dependency_overrides.clear()


if __name__ == "__main__":
    ok = 0
    for name, fn in sorted(globals().items()):
        if name.startswith("test_") and callable(fn):
            try:
                fn(); ok += 1; print("PASS", name)
            except Exception as e:
                import traceback; traceback.print_exc(); print("FAIL", name, type(e).__name__, e)
    print(f"{ok} passed")
