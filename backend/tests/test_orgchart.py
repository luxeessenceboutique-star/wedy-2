"""The company org chart: real structure (departments, heads, reporting lines, who leads), edited by HR.
Fake database:  python backend/tests/test_orgchart.py"""
import os
import sys
import tempfile

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.dirname(__file__))
os.environ["INTERVIEW_REMINDERS"] = "false"

from fakedb import FakeDB  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.config import settings  # noqa: E402
from app.database import get_db  # noqa: E402
from app.dependencies import get_current_user, require_hr_or_admin  # noqa: E402
from app.main import app  # noqa: E402

settings.UPLOAD_DIR = tempfile.mkdtemp(prefix="wedy-test-uploads-")
settings.DURABLE_STORAGE = False
HR = {"id": "11111111-2222-3333-4444-555555555555", "role_name": "hr", "email": "rh@exemple.ma", "full_name": "Salma RH"}
EMP = {**HR, "role_name": "employee"}
A, B, C, D, I = (f"00000000-0000-4000-8000-00000000000{x}" for x in "abcde")


def client(user=HR):
    db = FakeDB()
    db.tables["employees"] = [
        {"id": A, "full_name": "Amine Alaoui", "position": "Directeur technique", "department": "DEV FULL-STACK", "status": "active", "manager_id": None, "manager": None},
        {"id": B, "full_name": "Badr Bennani", "position": "Développeur", "department": "Dev Full-Stack", "status": "active", "manager_id": None, "manager": None},
        {"id": C, "full_name": "Chama Chraibi", "position": "Data scientist", "department": "DATA IA", "status": "active", "manager_id": None, "manager": None},
        {"id": D, "full_name": "Dounia Daoudi", "position": "Data engineer", "department": "Data IA", "status": "on-leave", "manager_id": None, "manager": None},
        {"id": I, "full_name": "Ilyas Idrissi", "position": "Stagiaire", "department": None, "status": "intern", "manager_id": None, "manager": None},
    ]
    db.tables["departments"] = [{"id": "dep1", "name": "DEV FULL-STACK", "manager_id": None, "description": None}]
    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[require_hr_or_admin] = lambda: user
    return TestClient(app), db


def emp(db, pid):
    return next(e for e in db.tables["employees"] if e["id"] == pid)


def test_people_and_structure_are_the_real_ones():
    c, db = client()
    people = c.get("/api/orgchart/people").json()
    assert {p["id"] for p in people} == {A, B, C, D, I} and all("manager_id" in p for p in people)
    st = c.get("/api/orgchart/structure").json()
    assert st["ceo_id"] is None and st["can_edit"] and [d["name"] for d in st["departments"]] == ["DEV FULL-STACK"]
    c, _ = client(EMP)
    assert not c.get("/api/orgchart/structure").json()["can_edit"]


def test_hr_sets_the_reporting_line_department_and_position():
    c, db = client()
    r = c.patch(f"/api/orgchart/people/{B}", json={"manager_id": A, "position": "Développeur senior"})
    assert r.status_code == 200, r.text
    assert emp(db, B)["manager_id"] == A and emp(db, B)["manager"] == "Amine Alaoui" and emp(db, B)["position"] == "Développeur senior"
    # no loop: A cannot report to B, who reports to A
    r = c.patch(f"/api/orgchart/people/{A}", json={"manager_id": B})
    assert r.status_code == 422 and "déjà sous la responsabilité" in r.json()["detail"]
    assert c.patch(f"/api/orgchart/people/{A}", json={"manager_id": A}).status_code == 422
    # a department spelled differently joins the existing one; a new one is created
    c.patch(f"/api/orgchart/people/{I}", json={"department": "dev full stack"})
    assert emp(db, I)["department"] == "DEV FULL-STACK"
    c.patch(f"/api/orgchart/people/{I}", json={"department": "Cyber-sécurité"})
    assert emp(db, I)["department"] == "Cyber-sécurité" and any(d["name"] == "Cyber-sécurité" for d in db.tables["departments"])
    # null manager: reports to the department head again; only the fields sent change
    c.patch(f"/api/orgchart/people/{B}", json={"manager_id": None})
    assert emp(db, B)["manager_id"] is None and emp(db, B)["manager"] is None and emp(db, B)["position"] == "Développeur senior"


def test_department_head_rename_merge_and_delete():
    c, db = client()
    r = c.patch("/api/orgchart/departments", json={"name": "Dev Full-Stack", "manager_id": A})
    assert r.status_code == 200 and r.json()["manager_id"] == A and len(db.tables["departments"]) == 1
    # a department known only from the files gets its row
    c.patch("/api/orgchart/departments", json={"name": "Data IA", "manager_id": C})
    data = next(d for d in db.tables["departments"] if d["name"] in ("DATA IA", "Data IA"))
    assert data["manager_id"] == C
    # rename: every file follows (both spellings)
    r = c.patch("/api/orgchart/departments", json={"name": "data ia", "new_name": "Data & IA"})
    assert r.json()["name"] == "Data & IA" and emp(db, C)["department"] == "Data & IA" and emp(db, D)["department"] == "Data & IA"
    # merge into an existing department: the people move, the target keeps its head
    r = c.patch("/api/orgchart/departments", json={"name": "Data & IA", "new_name": "dev full-stack"}).json()
    assert r["name"] == "DEV FULL-STACK" and r["manager_id"] == A and len(db.tables["departments"]) == 1
    assert emp(db, C)["department"] == "DEV FULL-STACK"
    # delete: only when empty
    assert c.delete("/api/orgchart/departments", params={"name": "DEV FULL-STACK"}).status_code == 409
    c.post("/api/orgchart/departments", json={"name": "Finance"})
    assert c.delete("/api/orgchart/departments", params={"name": "finance"}).json() == {"deleted": True}
    assert [d["name"] for d in db.tables["departments"]] == ["DEV FULL-STACK"]


def test_the_top_of_the_chart_and_rights():
    c, db = client()
    assert c.put("/api/orgchart/head", json={"employee_id": A}).json() == {"ceo_id": A}
    assert c.get("/api/orgchart/structure").json()["ceo_id"] == A
    assert c.put("/api/orgchart/head", json={"employee_id": None}).json() == {"ceo_id": None}
    assert c.put("/api/orgchart/head", json={"employee_id": "00000000-0000-4000-8000-000000000999"}).status_code == 404
    # an employee cannot change the chart
    app.dependency_overrides.pop(require_hr_or_admin, None)
    app.dependency_overrides[get_current_user] = lambda: EMP
    assert c.patch(f"/api/orgchart/people/{B}", json={"manager_id": A}).status_code == 403
    assert emp(db, B)["manager_id"] is None


if __name__ == "__main__":
    fails = 0
    for name, fn in list(globals().items()):
        if name.startswith("test_") and callable(fn):
            try:
                fn(); print("PASS", name)
            except Exception as e:  # noqa: BLE001
                import traceback; traceback.print_exc(); fails += 1; print("FAIL", name, type(e).__name__, e)
    print(f"{fails} failed" if fails else "all passed")
    sys.exit(1 if fails else 0)
