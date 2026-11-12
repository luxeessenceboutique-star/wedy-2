"""Login errors against Tybot are logged for the admin (without the password) and stay generic for the browser:  python backend/tests/test_tybot_login.py"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import httpx  # noqa: E402
from fastapi import HTTPException  # noqa: E402
from loguru import logger  # noqa: E402

from app.services import tybot_auth  # noqa: E402

SECRET = "S3cret-pass-123"


def attempt(answer):
    """Run tybot_auth.login against a fake Tybot answer; returns (exception or None, captured log text)."""
    logs: list = []
    sink = logger.add(lambda m: logs.append(str(m)), level="DEBUG")
    real = tybot_auth.httpx.post
    def fake(url, json=None, timeout=None):  # noqa: A002
        if isinstance(answer, Exception):
            raise answer
        return answer
    tybot_auth.httpx.post = fake
    try:
        tybot_auth.login("Salma@Tython.ma", SECRET)
        err = None
    except HTTPException as e:
        err = e
    finally:
        tybot_auth.httpx.post = real
        logger.remove(sink)
    return err, "\n".join(logs)


def reply(status, body):
    return httpx.Response(status, json=body, request=httpx.Request("POST", "https://api.tybotflow.com/api/v1/auth/login"))


def test_refused_credentials_are_logged_with_tybots_reason_but_not_the_password():
    for status, body, why in ((401, {"message": "Invalid credentials"}, "Invalid credentials"), (400, {"detail": "User not found"}, "User not found")):
        err, log = attempt(reply(status, body))
        assert err.status_code == 401 and err.detail == "Email ou mot de passe incorrect"      # the browser learns nothing more
        assert f"HTTP {status}" in log and why in log and "salma@tython.ma" in log and "/auth/login" in log
        assert SECRET not in log


def test_other_failures_keep_their_meaning():
    err, log = attempt(reply(403, {"message": "blocked"}))
    assert err.status_code == 403 and "blocked" in log and SECRET not in log
    err, log = attempt(reply(500, {"message": "boom"}))
    assert err.status_code == 502 and "HTTP 500" in log and SECRET not in log
    err, _ = attempt(httpx.ConnectError("no route"))
    assert err.status_code == 503


def test_a_refusal_with_a_strange_body_does_not_break_the_log():
    err, log = attempt(httpx.Response(401, content=b"<html>Forbidden</html>", request=httpx.Request("POST", "https://x")))
    assert err.status_code == 401 and "Forbidden" in log


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
