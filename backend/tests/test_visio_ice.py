"""ICE / TURN configuration of Wedy Visio:  python backend/tests/test_visio_ice.py"""
import base64
import hashlib
import hmac
import os
import sys
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.dirname(__file__))

from fakedb import FakeDB  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

import app.routers.visio as V  # noqa: E402
from app.database import get_db  # noqa: E402
from app.main import app  # noqa: E402

ROOM = "m-33333333-3333-3333-3333-333333333333"
ENV = ("VISIO_TURN_URL", "VISIO_TURN_SECRET", "VISIO_TURN_USERNAME", "VISIO_TURN_CREDENTIAL")


def setup(env: dict, staff: bool = False):
    saved = {k: os.environ.pop(k, None) for k in ENV}
    os.environ.update(env)
    db = FakeDB()
    app.dependency_overrides[get_db] = lambda: db
    real = V.get_current_user
    def fake_user(cred, sb):
        if cred.credentials != "staff-token":
            raise Exception("bad token")
        return {"id": "u1", "role_name": "hr", "email": "hr@t.ma"}
    V.get_current_user = fake_user
    def undo():
        V.get_current_user = real
        app.dependency_overrides.clear()
        for k in ENV:
            os.environ.pop(k, None)
        for k, v in saved.items():
            if v is not None:
                os.environ[k] = v
    return TestClient(app), undo


def guest_key(room=ROOM, expires=None):
    return V._sign({"r": room, "n": "Zineb", "e": int(expires or time.time() + 3600), "j": "abc"})


def relay_in(body):
    return [s for s in body["iceServers"] if any(str(u).startswith(("turn:", "turns:")) for u in s["urls"])]


def test_without_a_relay_only_stun_is_given_and_the_client_is_told():
    c, undo = setup({})
    try:
        body = c.get("/api/visio/ice").json()
    finally:
        undo()
    assert body["turn"] is False and body["turn_configured"] is False and body["turn_mode"] == "none" and relay_in(body) == []
    assert any(u.startswith("stun:") for s in body["iceServers"] for u in s["urls"])


def test_ephemeral_credentials_follow_the_coturn_rest_scheme():
    c, undo = setup({"VISIO_TURN_URL": "turn:turn.example:3478?transport=udp, turn:turn.example:3478?transport=tcp", "VISIO_TURN_SECRET": "s3cret"})
    try:
        before = time.time()
        body = c.get("/api/visio/ice", headers={"Authorization": "Bearer staff-token"}).json()
    finally:
        undo()
    (turn,) = relay_in(body)
    assert turn["urls"] == ["turn:turn.example:3478?transport=udp", "turn:turn.example:3478?transport=tcp"]
    expiry, label = turn["username"].split(":")
    assert label == "wedy" and abs(int(expiry) - (before + V.TURN_TTL)) < 5          # valid for 12 hours
    expected = base64.b64encode(hmac.new(b"s3cret", turn["username"].encode(), hashlib.sha1).digest()).decode()
    assert turn["credential"] == expected                                              # what coturn computes with static-auth-secret
    assert body["turn"] is True and body["turn_mode"] == "ephemeral" and "s3cret" not in str(body)


def test_static_credentials_still_work():
    c, undo = setup({"VISIO_TURN_URL": "turn:turn.example:3478", "VISIO_TURN_USERNAME": "wedy", "VISIO_TURN_CREDENTIAL": "pw"})
    try:
        body = c.get("/api/visio/ice", headers={"Authorization": "Bearer staff-token"}).json()
    finally:
        undo()
    (turn,) = relay_in(body)
    assert (turn["username"], turn["credential"]) == ("wedy", "pw") and body["turn_mode"] == "static"


def test_relay_credentials_go_to_staff_and_invited_guests_only():
    c, undo = setup({"VISIO_TURN_URL": "turn:turn.example:3478", "VISIO_TURN_SECRET": "s3cret"})
    try:
        anonymous = c.get("/api/visio/ice").json()
        wrong_token = c.get("/api/visio/ice", headers={"Authorization": "Bearer nope"}).json()
        guest = c.get(f"/api/visio/ice?room={ROOM}&k={guest_key()}").json()
        other_room = c.get(f"/api/visio/ice?room=m-44444444-4444-4444-4444-444444444444&k={guest_key()}").json()
        expired = c.get(f"/api/visio/ice?room={ROOM}&k={guest_key(expires=time.time() - 10)}").json()
        forged = c.get(f"/api/visio/ice?room={ROOM}&k=abc.def").json()
    finally:
        undo()
    for denied in (anonymous, wrong_token, other_room, expired, forged):
        assert denied["turn"] is False and relay_in(denied) == [] and denied["turn_configured"] is True   # configured, but not for this caller
    assert guest["turn"] is True and len(relay_in(guest)) == 1


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
