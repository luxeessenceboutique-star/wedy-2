"""Naming and renaming of files in an employee folder (fake database, temp upload dir):  python backend/tests/test_employee_files.py"""
import os
import sys
import tempfile

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.dirname(__file__))

from fakedb import FakeDB  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.config import settings  # noqa: E402
from app.services import storage  # noqa: E402
from app.database import get_db  # noqa: E402
from app.dependencies import get_current_user, require_hr_or_admin  # noqa: E402
from app.main import app  # noqa: E402

settings.UPLOAD_DIR = tempfile.mkdtemp(prefix="wedy-test-uploads-")
settings.DURABLE_STORAGE = False  # tests must never write to the real Supabase Storage; the durable tests below use an in-memory bucket
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


def test_listing_says_which_files_are_still_on_disk():
    c, db = client()
    a = upload(c, "A.pdf", None).json()
    b = upload(c, "B.pdf", None).json()
    os.remove(os.path.join(settings.UPLOAD_DIR, b["file_path"]))  # what a redeploy without a persistent volume does
    rows = {r["id"]: r for r in c.get(f"/api/employees/{EMP}/files").json()}
    assert rows[a["id"]]["available"] is True and rows[b["id"]]["available"] is False


def test_uploads_endpoint_serves_files_and_never_leaves_the_folder():
    c, _ = client()
    created = upload(c, "CV.pdf", None).json()
    ok = c.get(f"/api/uploads/{created['file_path']}")
    assert ok.status_code == 200 and ok.content.startswith(b"%PDF")
    gone = c.get("/api/uploads/employees/nothing/here.pdf")
    assert gone.status_code == 404 and "introuvable" in gone.json()["detail"].lower()
    secret = os.path.join(os.path.dirname(settings.UPLOAD_DIR), "wedy-secret.txt")
    with open(secret, "w") as f:
        f.write("secret")
    try:
        for evil in ("../wedy-secret.txt", "..%2Fwedy-secret.txt", "employees/../../wedy-secret.txt"):
            assert c.get(f"/api/uploads/{evil}").status_code == 404, evil
    finally:
        os.remove(secret)


class FakeBucket:
    """In-memory stand-in for a Supabase Storage bucket (same method names and argument order as storage3)."""
    def __init__(self):
        self.objects: dict = {}

    def upload(self, path, file, file_options=None):
        self.objects[path] = (bytes(file), (file_options or {}).get("content-type"))

    def download(self, path):
        if path not in self.objects:
            raise RuntimeError("Object not found")
        return self.objects[path][0]

    def remove(self, paths):
        for p in paths:
            self.objects.pop(p, None)

    def list(self, path, options=None):
        prefix = path.rstrip("/") + "/"
        return [{"name": k[len(prefix):]} for k in self.objects if k.startswith(prefix) and "/" not in k[len(prefix):]]


def with_bucket(bucket):
    """Turn durable storage on for one test, backed by `bucket` (None = Storage unreachable)."""
    saved_flag, saved_fn = settings.DURABLE_STORAGE, storage._durable_bucket
    settings.DURABLE_STORAGE = True
    storage._durable_bucket = lambda: bucket
    return lambda: (setattr(settings, "DURABLE_STORAGE", saved_flag), setattr(storage, "_durable_bucket", saved_fn))


def wipe_disk(rel_path: str):
    os.remove(os.path.join(settings.UPLOAD_DIR, rel_path))  # what a redeploy without a persistent volume does


def test_upload_keeps_a_durable_copy():
    bucket = FakeBucket(); restore = with_bucket(bucket)
    try:
        c, _ = client()
        created = upload(c, "CV.pdf", "CV Hiba").json()
        data, ctype = bucket.objects[created["file_path"]]
        assert data.startswith(b"%PDF") and ctype == "application/pdf"
    finally:
        restore()


def test_a_redeploy_that_wipes_the_disk_loses_nothing():
    bucket = FakeBucket(); restore = with_bucket(bucket)
    try:
        c, _ = client()
        created = upload(c, "CV.pdf", None).json()
        wipe_disk(created["file_path"])
        listed = c.get(f"/api/employees/{EMP}/files").json()
        assert listed[0]["available"] is True                       # still retrievable
        got = c.get(f"/api/uploads/{created['file_path']}")
        assert got.status_code == 200 and got.content.startswith(b"%PDF")
        assert os.path.isfile(os.path.join(settings.UPLOAD_DIR, created["file_path"]))  # the disk cache is refilled
    finally:
        restore()


def test_deleting_a_file_deletes_its_durable_copy():
    bucket = FakeBucket(); restore = with_bucket(bucket)
    try:
        c, _ = client()
        created = upload(c, "CV.pdf", None).json()
        assert c.delete(f"/api/employees/{EMP}/files/{created['id']}").status_code == 204
        assert bucket.objects == {}
    finally:
        restore()


def test_unreachable_storage_degrades_to_the_disk_only_behaviour():
    restore = with_bucket(None)
    try:
        c, _ = client()
        created = upload(c, "CV.pdf", None)
        assert created.status_code == 201                            # an upload never fails because of Storage
        path = created.json()["file_path"]
        wipe_disk(path)
        assert c.get(f"/api/employees/{EMP}/files").json()[0]["available"] is False
        assert c.get(f"/api/uploads/{path}").status_code == 404
    finally:
        restore()


def test_files_already_on_disk_are_copied_once_at_startup():
    c, db = client()
    upload(c, "A.pdf", None); upload(c, "B.pdf", None)               # uploaded while durable storage did not exist
    bucket = FakeBucket(); restore = with_bucket(bucket)
    try:
        rows = db.tables["employee_files"]
        assert storage.backfill_durable(rows) == 2 and len(bucket.objects) == 2
        assert storage.backfill_durable(rows) == 0                   # nothing to copy the second time
    finally:
        restore()


def test_ensure_local_restores_only_what_exists_somewhere():
    bucket = FakeBucket(); restore = with_bucket(bucket)
    try:
        c, _ = client()
        created = upload(c, "CV.pdf", None).json()
        wipe_disk(created["file_path"])
        assert storage.ensure_local(created["file_path"]) and storage.read_upload(created["file_path"]).startswith(b"%PDF")
        assert storage.ensure_local("employees/nobody/none.pdf") is None
        assert storage.ensure_local("../outside.pdf") is None
    finally:
        restore()


def test_a_lost_file_can_be_put_back_under_its_record():
    bucket = FakeBucket(); restore = with_bucket(bucket)
    try:
        c, db = client()
        created = upload(c, "CIN.pdf", "CIN Nizar").json()
        wipe_disk(created["file_path"]); bucket.objects.clear()           # lost everywhere: what happened to the old files
        assert c.get(f"/api/employees/{EMP}/files").json()[0]["available"] is False
        r = c.put(f"/api/employees/{EMP}/files/{created['id']}/content", files={"file": ("scan.pdf", b"%PDF-1.1 new", "application/pdf")})
        assert r.status_code == 200 and r.json()["name"] == "CIN Nizar.pdf"                 # same record, same name
        row = c.get(f"/api/employees/{EMP}/files").json()[0]
        assert row["id"] == created["id"] and row["available"] is True and row["file_type"] == "autre"
        assert c.get(f"/api/uploads/{row['file_path']}").content == b"%PDF-1.1 new"
        assert row["file_path"] in bucket.objects and len(db.tables["employee_files"]) == 1
    finally:
        restore()


def test_putting_back_another_kind_of_file_fixes_the_extension_and_drops_the_old_copy():
    bucket = FakeBucket(); restore = with_bucket(bucket)
    try:
        c, _ = client()
        created = upload(c, "CIN.pdf", "CIN Nizar").json()
        r = c.put(f"/api/employees/{EMP}/files/{created['id']}/content", files={"file": ("photo.jpg", b"\xff\xd8\xff jpeg", "image/jpeg")})
        assert r.json()["name"] == "CIN Nizar.jpg" and r.json()["file_path"].endswith(".jpg")
        assert created["file_path"] not in bucket.objects and not os.path.exists(os.path.join(settings.UPLOAD_DIR, created["file_path"]))
    finally:
        restore()


def test_putting_back_rejects_empty_files_and_unknown_records():
    c, _ = client()
    created = upload(c, "CIN.pdf", None).json()
    assert c.put(f"/api/employees/{EMP}/files/{created['id']}/content", files={"file": ("x.pdf", b"", "application/pdf")}).status_code == 422
    assert c.put(f"/api/employees/{EMP}/files/00000000-0000-4000-8000-0000000000ff/content", files={"file": ("x.pdf", b"x", "application/pdf")}).status_code == 404


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
