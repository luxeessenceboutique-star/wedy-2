"""Decision e-mails to a candidate: « candidature retenue » after the interviews, or the refusal. HR reads (and can
change) the words before sending. Fake database, fake SMTP:  python backend/tests/test_decision_mail.py"""
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
from app.services import mailer  # noqa: E402

settings.UPLOAD_DIR = tempfile.mkdtemp(prefix="wedy-test-uploads-")
settings.DURABLE_STORAGE = False
USER = {"id": "11111111-2222-3333-4444-555555555555", "role_name": "hr", "email": "rh@exemple.ma", "full_name": "Salma RH"}
CAND = "00000000-0000-4000-8000-0000000000d1"
AD = "00000000-0000-4000-8000-0000000000a1"
SENT: list = []


def client(email="nadia@mail.ma", status="candidate", interviews=1, mail=True):
    SENT.clear()
    settings.MAIL_SERVER = "smtp.test" if mail else ""
    settings.MAIL_FROM, settings.MAIL_FROM_NAME, settings.MAIL_USERNAME, settings.MAIL_PASSWORD = "rh@exemple.ma", "Exemple RH", "rh@exemple.ma", "x"
    mailer.transport = SENT.append
    db = FakeDB()
    db.tables["employees"] = [{"id": CAND, "full_name": "Nadia Tazi", "email": email, "position": "Designer", "status": status,
                               "custom_fields": {"ad_id": AD, "recruitment_stage": "offer"}}]
    db.tables["recruitment_ads"] = [{"id": AD, "poste": "Développeuse React"}]
    db.tables["interviews"] = [{"id": f"iv{i}", "candidate_id": CAND, "status": "completed"} for i in range(interviews)]
    db.tables["app_settings"] = [{"key": "company", "value": {"name": "Acme SARL", "email": "rh@acme.ma"}}]
    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[get_current_user] = lambda: USER
    app.dependency_overrides[require_hr_or_admin] = lambda: USER
    return TestClient(app), db


def body_of(msg) -> str:
    return "\n".join(p.get_content() for p in msg.walk() if p.get_content_type() in ("text/plain", "text/html"))


def test_the_acceptance_is_proposed_then_sent_and_kept_on_the_file():
    c, db = client()
    p = c.post(f"/api/entretiens/decision-mail/{CAND}/preview", json={"kind": "accept"}).json()
    assert p["to"] == "nadia@mail.ma" and p["configured"] and p["sent"] is None
    assert p["subject"] == "Votre candidature au poste de Développeuse React – bonne nouvelle"
    assert p["message"].startswith("Bonjour Nadia Tazi,") and "a été retenue à l’issue de vos entretiens avec Acme SARL" in p["message"]
    assert "Candidature retenue" in p["html"] and "Félicitations" in p["html"] and not SENT   # a preview sends nothing
    r = c.post(f"/api/entretiens/decision-mail/{CAND}", json={"kind": "accept", "subject": p["subject"], "message": p["message"]}).json()
    assert r["sent"] and r["to"] == "nadia@mail.ma" and len(SENT) == 1
    msg = SENT[0]
    assert msg["To"] == "nadia@mail.ma" and msg["Subject"] == p["subject"] and msg["Reply-To"] == "rh@acme.ma"
    assert "Notre équipe Ressources Humaines vous contactera" in body_of(msg)
    rec = db.tables["employees"][0]["custom_fields"]["decision_mail"]
    assert rec["kind"] == "accept" and rec["to"] == "nadia@mail.ma" and rec["by"] == "Salma RH"
    assert db.tables["employees"][0]["custom_fields"]["recruitment_stage"] == "offer"   # the rest of the file is kept
    # the screens then say it was sent
    assert c.post(f"/api/entretiens/decision-mail/{CAND}/preview", json={"kind": "accept"}).json()["sent"]["kind"] == "accept"


def test_the_refusal_and_hr_s_own_words():
    c, _ = client()
    p = c.post(f"/api/entretiens/decision-mail/{CAND}/preview", json={"kind": "reject"}).json()
    assert p["subject"] == "Votre candidature au poste de Développeuse React"
    assert "lors de vos entretiens pour le poste de Développeuse React" in p["message"]
    assert "nous ne donnerons pas une suite favorable" in p["message"] and "Nous conservons votre profil" in p["message"]
    assert "Suite de votre candidature" in p["html"] and "Félicitations" not in p["html"]
    mine = "Bonjour Nadia,\n\nMerci pour vos entretiens.\nLe poste a été pourvu.\n\nBonne continuation <3"
    r = c.post(f"/api/entretiens/decision-mail/{CAND}", json={"kind": "reject", "subject": "Votre candidature", "message": mine}).json()
    assert r["sent"]
    html = next(p for p in SENT[0].walk() if p.get_content_type() == "text/html").get_content()
    assert "Merci pour vos entretiens.<br>Le poste a été pourvu." in html and "Bonne continuation &lt;3" in html   # escaped
    assert "nous ne donnerons pas" not in html and SENT[0]["Subject"] == "Votre candidature"


def test_wording_without_interviews_and_for_an_intern():
    c, _ = client(interviews=0)
    p = c.post(f"/api/entretiens/decision-mail/{CAND}/preview", json={"kind": "reject"}).json()
    assert "pour votre candidature au poste de Développeuse React" in p["message"] and "entretiens" not in p["message"]
    c, _ = client(status="intern")
    p = c.post(f"/api/entretiens/decision-mail/{CAND}/preview", json={"kind": "accept"}).json()
    assert "au stage de Développeuse React" in p["subject"] and "la convention" in p["message"]
    p = c.post(f"/api/entretiens/decision-mail/{CAND}/preview", json={"kind": "accept", "intern": False}).json()
    assert "au poste de" in p["subject"]


def test_nothing_is_sent_without_address_or_mail_account():
    c, db = client(email=None)
    r = c.post(f"/api/entretiens/decision-mail/{CAND}", json={"kind": "reject"}).json()
    assert not r["sent"] and "pas d'adresse" in r["error"] and not SENT
    c, db = client(mail=False)
    assert not c.post(f"/api/entretiens/decision-mail/{CAND}/preview", json={"kind": "reject"}).json()["configured"]
    r = c.post(f"/api/entretiens/decision-mail/{CAND}", json={"kind": "reject"}).json()
    assert not r["sent"] and "pas encore configurés" in r["error"] and "decision_mail" not in db.tables["employees"][0]["custom_fields"]
    assert c.post("/api/entretiens/decision-mail/00000000-0000-4000-8000-000000000999/preview", json={"kind": "reject"}).status_code == 404


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
