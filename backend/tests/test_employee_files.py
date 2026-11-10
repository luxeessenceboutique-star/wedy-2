"""Naming and renaming of files in an employee folder (fake database, temp upload dir):  python backend/tests/test_employee_files.py"""
import os
import sys
import tempfile

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.dirname(__file__))

from fakedb import FakeDB  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.config import settings  # noqa: E402
from app.database import get_db  # noqa: E402
from app.dependencies import get_current_user, require_hr_or_admin  # noqa: E402
from app.main import app  # noqa: E402

settings.UPLOAD_DIR = tempfile.mkdtemp(prefix="wedy-test-uploads-")
EMP = "00000000-0000-4000-8000-0000000000e1"
USER = {"id": "11111111-2222-3333-4444-555555555555", "role_name": "hr", "email": "hr@t.ma"}


def client() -> tuple[TestClient, FakeDB]:
    db = FakeDB()
    db.tables["employees"] = [{"id": EMP, "full_name": "Hiba", "status": "active"}]
    db.tables["employee_files"] = []
    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[get_current_user] = lambda: USER
    app.dependency_overrides[require_hr_or_admin] = lambda: USER
    return TestClient(app), db


def upload(c: TestClient, filename: str, name: str | None):
    data = {"file_type": "autre"}
    if name is not None:
        data["name"] = name
    return c.post(f"/api/employees/{EMP}/files", files={"file": (filename, b"%PDF-1.1 x", "application/pdf")}, data=data)


def test_upload_keeps_the_file_name_when_none_is_given():
    c, _ = client()
    r = upload(c, "IMG_0013.pdf", None)
    assert r.status_code == 201 and r.json()["name"] == "IMG_0013.pdf"


def test_upload_uses_the_chosen_name_and_keeps_the_extension():
    c, _ = client()
    assert upload(c, "IMG_0013.pdf", "Attestation de travail").json()["name"] == "Attestation de travail.pdf"
    assert upload(c, "IMG_0013.pdf", "RIB.PDF").json()["name"] == "RIB.PDF"
    assert upload(c, "scan.jpg", "../../etc/passwd").json()["name"] == ".. .. etc passwd.jpg"


def test_rename_changes_only_the_displayed_name():
    c, db = client()
    created = upload(c, "CV.pdf", None).json()
    stored_path = created["file_path"]
    r = c.patch(f"/api/employees/{EMP}/files/{created['id']}", json={"name": "CV 2026"})
    assert r.status_code == 200 and r.json()["name"] == "CV 2026.pdf"
    row = db.tables["employee_files"][0]
    assert row["name"] == "CV 2026.pdf" and row["file_path"] == stored_path
    assert os.path.exists(os.path.join(settings.UPLOAD_DIR, stored_path))


def test_rename_rejects_empty_names_and_unknown_files():
    c, _ = client()
    created = upload(c, "CV.pdf", None).json()
    assert c.patch(f"/api/employees/{EMP}/files/{created['id']}", json={"name": "   "}).status_code == 422
    assert c.patch(f"/api/employees/{EMP}/files/00000000-0000-4000-8000-0000000000ff", json={"name": "x"}).status_code == 404


if __name__ == "__main__":
    fails = 0
    for name, fn in list(globals().items()):
        if name.startswith("test_") and callable(fn):
            try:
                fn(); print("PASS", name)
            except Exception as e:  # noqa: BLE001
                fails += 1; print("FAIL", name, type(e).__name__, e)
    print(f"{fails} failed" if fails else "all passed")
    sys.exit(1 if fails else 0)
