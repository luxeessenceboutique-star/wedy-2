"""Direct publishing on LinkedIn / Facebook / Instagram: one-time connection, encrypted tokens, publishing with the visual.
Fake database, fake LinkedIn / Meta servers (httpx.MockTransport): nothing leaves the machine.
    python backend/tests/test_social.py"""
import io
import json
import os
import sys
import tempfile
from datetime import datetime, timedelta, timezone
from urllib.parse import parse_qs, urlparse

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.dirname(__file__))
os.environ["INTERVIEW_REMINDERS"] = "false"
os.environ.pop("APP_PUBLIC_URL", None)

import httpx  # noqa: E402
from fakedb import FakeDB  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.config import settings  # noqa: E402
from app.database import get_db  # noqa: E402
from app.dependencies import get_current_user, require_hr_or_admin  # noqa: E402
from app.main import app  # noqa: E402
from app.services import social  # noqa: E402

settings.UPLOAD_DIR = tempfile.mkdtemp(prefix="wedy-test-uploads-")
settings.DURABLE_STORAGE = False
USER = {"id": "11111111-2222-3333-4444-555555555555", "role_name": "hr", "email": "rh@tython.ma", "full_name": "Salma"}
AD = "00000000-0000-4000-8000-0000000000ad"
H = {"x-forwarded-host": "wedy.tython.ma", "x-forwarded-proto": "https"}
CALLS: list = []


def fake_net(handler):
    def factory():
        def wrapped(req):
            CALLS.append(req)
            return handler(req)
        return httpx.Client(transport=httpx.MockTransport(wrapped))
    social.http = factory


def png():
    from PIL import Image
    buf = io.BytesIO()
    Image.new("RGB", (120, 63), (14, 111, 132)).save(buf, "PNG")
    return buf.getvalue()


def client(visual=True):
    CALLS.clear()
    for k, v in {"LINKEDIN_CLIENT_ID": "li-id", "LINKEDIN_CLIENT_SECRET": "li-secret", "META_APP_ID": "fb-id", "META_APP_SECRET": "fb-secret"}.items():
        os.environ[k] = v
    db = FakeDB()
    db.tables["recruitment_ads"] = [{"id": AD, "poste": "Développeur React (H/F)", "description": "Casablanca · CDI", "contenu": "• React\n• TypeScript"}]
    db.tables["social_accounts"], db.tables["social_posts"] = [], []
    os.makedirs(os.path.join(settings.UPLOAD_DIR, "annonces"), exist_ok=True)
    for fmt in ("linkedin", "square"):
        path = os.path.join(settings.UPLOAD_DIR, "annonces", f"{AD}-{fmt}.png")
        if visual:
            open(path, "wb").write(png())
        elif os.path.exists(path):
            os.remove(path)
    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[get_current_user] = lambda: USER
    app.dependency_overrides[require_hr_or_admin] = lambda: USER
    return TestClient(app), db


def linkedin_server(req):
    u = str(req.url)
    if "oauth/v2/accessToken" in u:
        form = parse_qs(req.content.decode())
        if form["grant_type"] == ["refresh_token"]:
            return httpx.Response(200, json={"access_token": "LI-NEW", "expires_in": 5184000})
        assert form["code"] == ["the-code"] and form["redirect_uri"] == ["https://wedy.tython.ma/api/social/callback/linkedin"]
        return httpx.Response(200, json={"access_token": "LI-TOKEN", "expires_in": 5184000, "refresh_token": "LI-REFRESH", "refresh_token_expires_in": 31536000})
    if "organizationAcls" in u:
        return httpx.Response(200, json={"elements": [{"organization": "urn:li:organization:777"}]})
    if "/rest/organizations/777" in u:
        return httpx.Response(200, json={"localizedName": "Tython"})
    if "images?action=initializeUpload" in u:
        return httpx.Response(200, json={"value": {"uploadUrl": "https://upload.linkedin.test/img1", "image": "urn:li:image:IMG1"}})
    if u.startswith("https://upload.linkedin.test"):
        return httpx.Response(201)
    if u.endswith("/rest/posts"):
        return httpx.Response(201, headers={"x-restli-id": "urn:li:share:999"})
    return httpx.Response(404, json={"message": f"unexpected {u}"})


def connect_linkedin(c):
    r = c.post("/api/social/linkedin/connect", headers=H)
    assert r.status_code == 200, r.text
    q = parse_qs(urlparse(r.json()["url"]).query)
    assert q["client_id"] == ["li-id"] and q["redirect_uri"] == ["https://wedy.tython.ma/api/social/callback/linkedin"]
    assert "w_organization_social" in q["scope"][0]
    fake_net(linkedin_server)
    r = c.get("/api/social/callback/linkedin", params={"code": "the-code", "state": q["state"][0]}, follow_redirects=False)
    assert r.status_code == 302 and r.headers["location"] == "https://wedy.tython.ma/app/integrations?social=linkedin&status=ok", r.headers.get("location")


def test_linkedin_is_connected_once_and_its_token_stays_secret():
    c, db = client()
    os.environ.pop("LINKEDIN_CLIENT_ID")
    assert c.post("/api/social/linkedin/connect", headers=H).status_code == 422          # not set up on the server
    os.environ["LINKEDIN_CLIENT_ID"] = "li-id"
    connect_linkedin(c)
    row = db.tables["social_accounts"][0]
    assert row["account_name"] == "Tython" and row["account_id"] == "777"
    assert "LI-TOKEN" not in json.dumps(row) and social.dec(row["access_token_enc"]) == "LI-TOKEN"   # encrypted at rest
    st = c.get("/api/social/status").json()
    assert st["linkedin"]["connected"] and st["linkedin"]["account_name"] == "Tython" and st["linkedin"]["connected_by"] == "Salma"
    assert "LI-TOKEN" not in json.dumps(st) and "token" not in json.dumps(st["linkedin"]["choices"])
    assert not st["meta"]["connected"]


def test_a_forged_or_cancelled_connection_is_refused():
    c, db = client()
    assert c.get("/api/social/callback/linkedin", params={"code": "x", "state": "forged.state"}, follow_redirects=False).status_code == 400
    q = parse_qs(urlparse(c.post("/api/social/linkedin/connect", headers=H).json()["url"]).query)
    r = c.get("/api/social/callback/linkedin", params={"error": "user_cancelled_login", "state": q["state"][0]}, follow_redirects=False)
    assert "status=error" in r.headers["location"] and not db.tables["social_accounts"]
    assert c.get("/api/social/callback/meta", params={"code": "x", "state": q["state"][0]}, follow_redirects=False).status_code == 400  # state of another network


def test_publishing_on_linkedin_with_the_visual():
    c, db = client()
    connect_linkedin(c)
    CALLS.clear()
    r = c.post("/api/social/publish", headers=H, json={"ad_id": AD, "networks": ["linkedin"],
                                                       "texts": {"linkedin": "🚀 Tython recrute (H/F) #recrutement @Tython"}})
    res = r.json()["results"]["linkedin"]
    assert res["ok"] and res["url"] == "https://www.linkedin.com/feed/update/urn:li:share:999/", res
    post = json.loads(next(x for x in CALLS if str(x.url).endswith("/rest/posts")).content)
    assert post["author"] == "urn:li:organization:777" and post["content"]["media"]["id"] == "urn:li:image:IMG1"
    assert post["commentary"] == "🚀 Tython recrute \\(H/F\\) \\#recrutement \\@Tython"              # LinkedIn's reserved characters escaped
    upload = next(x for x in CALLS if str(x.url).startswith("https://upload.linkedin.test"))
    assert upload.content[:4] == b"\x89PNG" and upload.headers["Authorization"] == "Bearer LI-TOKEN"
    assert db.tables["social_posts"][0]["ok"] and db.tables["social_posts"][0]["network"] == "linkedin"


def test_an_expiring_linkedin_token_is_renewed():
    c, db = client()
    connect_linkedin(c)
    db.tables["social_accounts"][0]["expires_at"] = (datetime.now(timezone.utc) + timedelta(hours=3)).isoformat()
    CALLS.clear()
    assert c.post("/api/social/publish", headers=H, json={"ad_id": AD, "networks": ["linkedin"]}).json()["results"]["linkedin"]["ok"]
    post = next(x for x in CALLS if str(x.url).endswith("/rest/posts"))
    assert post.headers["Authorization"] == "Bearer LI-NEW" and social.dec(db.tables["social_accounts"][0]["access_token_enc"]) == "LI-NEW"


def meta_server(req):
    u = str(req.url)
    if "/oauth/access_token" in u:
        q = parse_qs(urlparse(u).query)
        if q.get("grant_type") == ["fb_exchange_token"]:
            return httpx.Response(200, json={"access_token": "FB-LONG", "expires_in": 5183944})
        return httpx.Response(200, json={"access_token": "FB-SHORT"})
    if "/me/accounts" in u:
        return httpx.Response(200, json={"data": [
            {"id": "p1", "name": "Tython", "access_token": "PAGE-1", "instagram_business_account": {"id": "ig1", "username": "tython.ma"}},
            {"id": "p2", "name": "Autre page", "access_token": "PAGE-2"}]})
    if u.endswith("/p1/photos"):
        assert b"PAGE-1" in req.content and b"\x89PNG" in req.content
        return httpx.Response(200, json={"id": "ph1", "post_id": "p1_42"})
    if u.endswith("/ig1/media"):
        form = parse_qs(req.content.decode())
        assert form["image_url"] == [f"https://wedy.tython.ma/api/annonces/{AD}/visual/square.jpg"]
        return httpx.Response(200, json={"id": "c1"})
    if "/c1?" in u:
        return httpx.Response(200, json={"status_code": "FINISHED"})
    if u.endswith("/ig1/media_publish"):
        return httpx.Response(200, json={"id": "m1"})
    if "/m1?" in u:
        return httpx.Response(200, json={"permalink": "https://www.instagram.com/p/XYZ/"})
    return httpx.Response(400, json={"error": {"message": f"unexpected {u}"}})


def connect_meta(c):
    q = parse_qs(urlparse(c.post("/api/social/meta/connect", headers=H).json()["url"]).query)
    assert "pages_manage_posts" in q["scope"][0] and "instagram_content_publish" in q["scope"][0]
    fake_net(meta_server)
    r = c.get("/api/social/callback/meta", params={"code": "c0de", "state": q["state"][0]}, follow_redirects=False)
    assert r.headers["location"].endswith("status=ok"), r.headers["location"]


def test_facebook_and_instagram_from_one_meta_connection():
    c, db = client()
    connect_meta(c)
    st = c.get("/api/social/status").json()["meta"]
    assert st["account_name"] == "Tython" and st["ig_username"] == "tython.ma" and [x["id"] for x in st["choices"]] == ["p1", "p2"]
    assert "PAGE-1" not in json.dumps(db.tables["social_accounts"])
    res = c.post("/api/social/publish", headers=H, json={"ad_id": AD, "networks": ["facebook", "instagram"],
                                                         "texts": {"facebook": "On recrute !", "instagram": "Nous recrutons #maroc"}}).json()["results"]
    assert res["facebook"] == {"ok": True, "post_id": "p1_42", "url": "https://www.facebook.com/p1_42", "error": None}
    assert res["instagram"]["ok"] and res["instagram"]["url"] == "https://www.instagram.com/p/XYZ/"
    # the second page has no Instagram: choosing it says so, and a failure never stops the other networks
    assert c.post("/api/social/meta/account", json={"account_id": "p2"}).json()["account_name"] == "Autre page"
    res = c.post("/api/social/publish", headers=H, json={"ad_id": AD, "networks": ["instagram", "linkedin"]}).json()["results"]
    assert not res["instagram"]["ok"] and "Instagram" in res["instagram"]["error"]
    assert not res["linkedin"]["ok"] and "pas connecté" in res["linkedin"]["error"]
    assert c.post("/api/social/meta/account", json={"account_id": "nope"}).status_code == 422


def test_without_a_visual_and_disconnecting():
    c, db = client(visual=False)
    connect_meta(c)
    CALLS.clear()
    res = c.post("/api/social/publish", headers=H, json={"ad_id": AD, "networks": ["instagram"]}).json()["results"]["instagram"]
    assert not res["ok"] and "visuel" in res["error"] and not CALLS
    assert c.get(f"/api/annonces/{AD}/visual/square.jpg").status_code == 404
    assert c.delete("/api/social/meta").status_code == 204 and not db.tables["social_accounts"]
    assert not c.get("/api/social/status").json()["meta"]["connected"]


def test_the_public_jpeg_of_the_visual():
    c, _ = client()
    r = c.get(f"/api/annonces/{AD}/visual/square.jpg")
    assert r.status_code == 200 and r.headers["content-type"] == "image/jpeg" and r.content[:2] == b"\xff\xd8"


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
