"""AI artwork of the job-post visuals, with a fake HTTP transport (no network, no key is ever used):  python backend/tests/test_ad_art.py"""
import asyncio
import base64
import json
import os
import sys
import tempfile

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.dirname(__file__))

import httpx  # noqa: E402
from fakedb import FakeDB  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.config import settings  # noqa: E402
from app.database import get_db  # noqa: E402
from app.dependencies import get_current_user, require_hr_or_admin  # noqa: E402
from app.main import app  # noqa: E402
from app.services import image_ai  # noqa: E402

settings.UPLOAD_DIR = tempfile.mkdtemp(prefix="wedy-test-uploads-")
settings.DURABLE_STORAGE = False                       # never touch the real Supabase Storage
PNG = b"\x89PNG\r\n\x1a\n" + b"fake-art" * 20
AD = "00000000-0000-4000-8000-0000000000a1"
USER = {"id": "11111111-2222-3333-4444-555555555555", "role_name": "hr", "email": "hr@t.ma"}


def _no_chat_model(system, messages):
    raise RuntimeError("no chat model in tests")


def silence_chat_model():
    """The concept writer calls the app's chat model: never in tests (no network, no real key). Returns the undo."""
    from app.routers import copilot as copilot_router
    real = copilot_router._call_ai
    copilot_router._call_ai = _no_chat_model
    return lambda: setattr(copilot_router, "_call_ai", real)


def fake_http(handler):
    return httpx.AsyncClient(transport=httpx.MockTransport(handler))


def use_key(monkey: dict):
    """Pretend a key / model are configured (never a real one)."""
    keep = {k: getattr(settings, k) for k in ("OPENAI_API_KEY", "OPENAI_BASE_URL", "OPENAI_IMAGE_MODEL", "OPENAI_IMAGE_QUALITY", "OPENAI_IMAGE_API_KEY", "OPENAI_IMAGE_BASE_URL")}
    for k in ("OPENAI_IMAGE_API_KEY", "OPENAI_IMAGE_BASE_URL"):
        monkey.setdefault(k, "")
    for k, v in monkey.items():
        setattr(settings, k, v)
    envkeys = ("OPENAI_API_KEY", "OPENAI_BASE_URL", "OPENAI_IMAGE_MODEL", "OPENAI_IMAGE_QUALITY", "OPENAI_IMAGE_API_KEY", "OPENAI_IMAGE_BASE_URL")
    saved_env = {k: os.environ.pop(k, None) for k in envkeys}
    def restore():
        for k, v in keep.items():
            setattr(settings, k, v)
        for k, v in saved_env.items():
            if v is not None:
                os.environ[k] = v
    return restore


def test_request_for_a_gpt_image_model():
    restore = use_key({"OPENAI_API_KEY": "test-key", "OPENAI_BASE_URL": "https://router.example", "OPENAI_IMAGE_MODEL": "gpt-image-1", "OPENAI_IMAGE_QUALITY": "medium"})
    seen = {}
    def handler(req: httpx.Request):
        seen["url"], seen["auth"], seen["body"] = str(req.url), req.headers["authorization"], json.loads(req.content)
        return httpx.Response(200, json={"data": [{"b64_json": base64.b64encode(PNG).decode()}]})
    try:
        out = asyncio.run(image_ai.generate("a prompt", "linkedin", client=fake_http(handler)))
    finally:
        restore()
    assert out == PNG
    assert seen["url"] == "https://router.example/v1/images/generations" and seen["auth"] == "Bearer test-key"
    assert seen["body"] == {"model": "gpt-image-1", "prompt": "a prompt", "size": "1536x1024", "n": 1, "quality": "medium"}


def test_dalle_style_model_and_url_answers():
    restore = use_key({"OPENAI_API_KEY": "k", "OPENAI_IMAGE_MODEL": "dall-e-3"})
    bodies = []
    def handler(req: httpx.Request):
        if req.method == "GET":
            return httpx.Response(200, content=PNG)
        bodies.append(json.loads(req.content))
        return httpx.Response(200, json={"data": [{"url": "https://cdn.example/x.png"}]})
    try:
        out = asyncio.run(image_ai.generate("p", "story", client=fake_http(handler)))
    finally:
        restore()
    assert out == PNG and bodies[0]["size"] == "1024x1792" and bodies[0]["response_format"] == "b64_json" and "quality" not in bodies[0]


def test_optional_parameters_a_router_refuses_are_dropped_and_retried_once():
    restore = use_key({"OPENAI_API_KEY": "k", "OPENAI_IMAGE_MODEL": "gpt-image-1"})
    calls = []
    def handler(req: httpx.Request):
        body = json.loads(req.content); calls.append(body)
        if "quality" in body:
            return httpx.Response(400, json={"error": {"message": "Unknown parameter: 'quality'."}})
        return httpx.Response(200, json={"data": [{"b64_json": base64.b64encode(PNG).decode()}]})
    try:
        out = asyncio.run(image_ai.generate("p", "square", client=fake_http(handler)))
    finally:
        restore()
    assert out == PNG and len(calls) == 2 and "quality" not in calls[1]


def test_errors_are_explained_not_swallowed():
    restore = use_key({"OPENAI_API_KEY": "k"})
    try:
        for status, msg in ((401, "Incorrect API key"), (404, "model not found"), (429, "rate limit")):
            handler = lambda req, s=status, m=msg: httpx.Response(s, json={"error": {"message": m}})  # noqa: E731
            try:
                asyncio.run(image_ai.generate("p", "square", client=fake_http(handler)))
                raise AssertionError("should have failed")
            except image_ai.ImageFailed as e:
                assert str(status) in str(e) and msg in str(e)
        try:
            asyncio.run(image_ai.generate("p", "square", client=fake_http(lambda r: httpx.Response(200, json={"data": [{"b64_json": base64.b64encode(b"not an image").decode()}]}))))
            raise AssertionError("should have failed")
        except image_ai.ImageFailed as e:
            assert "image" in str(e)
    finally:
        restore()
    restore = use_key({"OPENAI_API_KEY": ""})
    try:
        asyncio.run(image_ai.generate("p", "square"))
        raise AssertionError("should have failed")
    except image_ai.ImageUnavailable:
        pass
    finally:
        restore()


def test_the_concept_follows_the_role_and_always_forbids_text():
    dev = image_ai.fallback_concept({"poste": "Développeur Full Stack", "description": "CDI · Casablanca"})
    acc = image_ai.fallback_concept({"poste": "Comptable", "description": "CDI"}, idea="bureau lumineux")
    assert "code" in dev and "bars" in acc and "bureau lumineux" in acc and dev != acc
    undo = silence_chat_model()
    try:
        full = asyncio.run(image_ai.concept({"poste": "Comptable"}, "Tython", "", "linkedin"))   # no chat model -> role template
    finally:
        undo()
    assert "No text" in full and "left 60%" in full and "landscape" in full


def client(db=None):
    db = db or FakeDB()
    db.tables["recruitment_ads"] = [{"id": AD, "poste": "Développeur Full Stack", "description": "CDI · Casablanca", "competences": "React, Python", "contenu": "Missions…"}]
    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[get_current_user] = lambda: USER
    app.dependency_overrides[require_hr_or_admin] = lambda: USER
    return TestClient(app)


def test_endpoint_generates_keeps_and_serves_the_art(monkeypatch=None):
    restore = use_key({"OPENAI_API_KEY": "k"})
    real = image_ai.generate
    async def fake_generate(prompt, fmt, client=None):
        fake_generate.last = (prompt, fmt); return PNG
    image_ai.generate = fake_generate
    image_ai._recent.clear()
    undo = silence_chat_model()
    try:
        c = client()
        assert c.get(f"/api/annonces/{AD}/ai-art/square.png").status_code == 404            # nothing yet
        r = c.post(f"/api/annonces/{AD}/ai-art", json={"format": "square", "company": "Tython", "idea": "équipe moderne"})
        assert r.status_code == 200 and r.content == PNG and r.headers["content-type"] == "image/png"
        assert "No text" in fake_generate.last[0] and fake_generate.last[1] == "square"
        again = c.get(f"/api/annonces/{AD}/ai-art/square.png")                              # kept: not paid for twice
        assert again.status_code == 200 and again.content == PNG
        assert c.get(f"/api/annonces/{AD}/ai-art/story.png").status_code == 404
        assert c.post(f"/api/annonces/{AD}/ai-art", json={"format": "banner"}).status_code == 422
        assert c.post("/api/annonces/00000000-0000-4000-8000-0000000000ff/ai-art", json={"format": "square"}).status_code == 404
    finally:
        image_ai.generate = real; undo(); restore()


def test_endpoint_reports_missing_configuration_and_service_errors_and_limits_spending():
    restore = use_key({"OPENAI_API_KEY": ""})
    real = image_ai.generate
    try:
        c = client()
        r = c.post(f"/api/annonces/{AD}/ai-art", json={"format": "square"})
        assert r.status_code == 503 and "OPENAI_API_KEY" in r.json()["detail"]
    finally:
        restore()
    restore = use_key({"OPENAI_API_KEY": "k"})
    async def boom(prompt, fmt, client=None):
        raise image_ai.ImageFailed("401 · Incorrect API key")
    image_ai.generate = boom; image_ai._recent.clear()
    undo = silence_chat_model()
    try:
        c = client()
        r = c.post(f"/api/annonces/{AD}/ai-art", json={"format": "square"})
        assert r.status_code == 502 and "401" in r.json()["detail"]
        image_ai._recent[USER["id"]].extend([image_ai.time.time()] * image_ai.RATE_LIMIT)
        assert c.post(f"/api/annonces/{AD}/ai-art", json={"format": "square"}).status_code == 429
    finally:
        image_ai.generate = real; image_ai._recent.clear(); undo(); restore()


def test_visuals_come_back_from_the_durable_copy_after_a_redeploy():
    from test_employee_files import FakeBucket, with_bucket  # noqa: PLC0415  (same in-memory bucket)
    bucket = FakeBucket(); restore = with_bucket(bucket)
    try:
        c = client()
        up = c.post(f"/api/annonces/{AD}/visual?fmt=linkedin", files={"file": ("v.png", PNG, "image/png")})
        assert up.status_code == 200 and f"annonces/{AD}-linkedin.png" in bucket.objects
        os.remove(os.path.join(settings.UPLOAD_DIR, "annonces", f"{AD}-linkedin.png"))        # the disk is wiped
        got = c.get(f"/api/annonces/{AD}/visual/linkedin.png")
        assert got.status_code == 200 and got.content == PNG
    finally:
        restore()


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
