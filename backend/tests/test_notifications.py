"""Deleting notifications: one, or all the already-read ones; only ever the caller's own:  python backend/tests/test_notifications.py"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.dirname(__file__))

from fakedb import FakeDB  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.database import get_db  # noqa: E402
from app.dependencies import get_current_user  # noqa: E402
from app.main import app  # noqa: E402

ME = "11111111-2222-3333-4444-555555555555"
OTHER = "99999999-2222-3333-4444-555555555555"


def setup():
    db = FakeDB()
    db.tables["notifications"] = [
        {"id": "n1", "user_id": ME, "title": "A", "message": "a", "type": "info", "read": False, "created_at": "2026-11-10T10:00:00Z"},
        {"id": "n2", "user_id": ME, "title": "B", "message": "b", "type": "info", "read": True, "created_at": "2026-11-09T10:00:00Z"},
        {"id": "n3", "user_id": ME, "title": "C", "message": "c", "type": "info", "read": True, "created_at": "2026-11-08T10:00:00Z"},
        {"id": "x1", "user_id": OTHER, "title": "Other", "message": "o", "type": "info", "read": True, "created_at": "2026-11-08T10:00:00Z"},
    ]
    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[get_current_user] = lambda: {"id": ME, "role_name": "hr", "email": "me@t.ma"}
    return TestClient(app), db


def ids(db, user=None):
    return sorted(r["id"] for r in db.tables["notifications"] if user is None or r["user_id"] == user)


def test_delete_one_removes_only_that_notification():
    c, db = setup()
    r = c.delete("/api/notifications/n1")
    assert r.status_code == 200 and r.json() == {"status": "deleted", "count": 1}
    assert ids(db, ME) == ["n2", "n3"] and ids(db, OTHER) == ["x1"]
    assert c.get("/api/notifications").json()["count"] == 2


def test_nobody_can_delete_someone_elses_notification():
    c, db = setup()
    r = c.delete("/api/notifications/x1")
    assert r.status_code == 200 and r.json()["count"] == 0
    assert ids(db, OTHER) == ["x1"]


def test_clearing_the_read_ones_keeps_the_unread_and_other_users():
    c, db = setup()
    r = c.delete("/api/notifications/read")
    assert r.status_code == 200 and r.json() == {"status": "deleted", "count": 2}
    assert ids(db) == ["n1", "x1"]          # my unread one and the other user's notification survive


def test_deleting_twice_is_harmless():
    c, _ = setup()
    assert c.delete("/api/notifications/n1").json()["count"] == 1
    assert c.delete("/api/notifications/n1").json()["count"] == 0


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
