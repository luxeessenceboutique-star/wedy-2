"""A deployment without LangChain / LangGraph must answer the Copilot with a clear 503, not a bare 500:  python backend/tests/test_copilot_missing_deps.py"""
import os
import subprocess
import sys
import textwrap

CHILD = textwrap.dedent("""
    import sys
    sys.path.insert(0, {root!r})
    for mod in ("langgraph", "langchain_core", "langchain_openai", "langchain_anthropic"):
        sys.modules[mod] = None  # `import langgraph` now raises ImportError, as on a server that never installed it
    from fastapi.testclient import TestClient
    from app.database import get_db
    from app.dependencies import get_current_user, require_hr_or_admin
    from app.main import app
    user = {{"id": "11111111-2222-3333-4444-555555555555", "role_name": "hr", "email": "hr@t.ma"}}
    app.dependency_overrides[get_db] = lambda: None
    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[require_hr_or_admin] = lambda: user
    c = TestClient(app)
    r = c.post("/api/copilot/agent", json={{"thread_id": "t1", "message": "Ajoute un stagiaire"}})
    print("agent", r.status_code, r.json().get("detail", "")[:80])
    r2 = c.get("/api/copilot/agents")
    print("agents", r2.status_code)
""")


def test_missing_libraries_give_a_503_with_the_fix():
    root = os.path.join(os.path.dirname(__file__), "..")
    out = subprocess.run([sys.executable, "-c", CHILD.format(root=root)], capture_output=True, text=True, timeout=120)
    lines = {l.split()[0]: l for l in out.stdout.splitlines() if l.startswith(("agent ", "agents "))}
    assert "agent 503" in lines["agent"] and "Copilot indisponible" in lines["agent"], out.stdout + out.stderr[-800:]
    assert lines["agents"].startswith("agents 503"), out.stdout


if __name__ == "__main__":
    try:
        test_missing_libraries_give_a_503_with_the_fix(); print("PASS test_missing_libraries_give_a_503_with_the_fix")
    except AssertionError as e:
        print("FAIL", e); sys.exit(1)
