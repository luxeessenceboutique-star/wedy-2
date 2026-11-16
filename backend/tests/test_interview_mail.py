"""Interview e-mails: the invitation when HR plans an interview, the link 15 minutes before, the cancellation.
Fake database, fake SMTP (nothing leaves the machine):  python backend/tests/test_interview_mail.py"""
import os
import sys
import tempfile
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.dirname(__file__))
os.environ["INTERVIEW_REMINDERS"] = "false"  # no background loop in the tests
os.environ.pop("APP_PUBLIC_URL", None)

from fakedb import FakeDB  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.config import settings  # noqa: E402
from app.database import get_db  # noqa: E402
from app.dependencies import get_current_user, require_hr_or_admin  # noqa: E402
from app.main import app  # noqa: E402
from app.services import interview_mail, mailer  # noqa: E402
from app.routers import visio  # noqa: E402

settings.UPLOAD_DIR = tempfile.mkdtemp(prefix="wedy-test-uploads-")
settings.DURABLE_STORAGE = False
USER = {"id": "11111111-2222-3333-4444-555555555555", "role_name": "hr", "email": "rh@tython.ma", "full_name": "Salma"}
CAND = "00000000-0000-4000-8000-0000000000c1"
SENT: list = []


def fake_transport(msg):
    SENT.append(msg)


def smtp(on=True):
    settings.MAIL_SERVER = "smtp.test" if on else ""
    settings.MAIL_FROM = "rh@tython.ma"
    settings.MAIL_FROM_NAME = "Tython RH"
    settings.MAIL_USERNAME = "rh@tython.ma"
    settings.MAIL_PASSWORD = "x"
    mailer.transport = fake_transport


def client(email="nadia@mail.ma"):
    SENT.clear()
    smtp()
    db = FakeDB()
    db.tables["employees"] = [{"id": CAND, "full_name": "Nadia Tazi", "email": email, "position": "Développeuse React", "status": "candidate", "custom_fields": {}}]
    db.tables["interviews"], db.tables["meetings"] = [], []
    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[get_current_user] = lambda: USER
    app.dependency_overrides[require_hr_or_admin] = lambda: USER
    return TestClient(app), db


def plan(c, starts_at: datetime, place=None, link=None, notify=True):
    local = starts_at.astimezone(interview_mail.tz())  # what HR typed, in their time zone
    body = {"candidate_id": CAND, "date": local.date().isoformat(), "start_time": local.strftime("%H:%M"),
            "end_time": (local + timedelta(minutes=45)).strftime("%H:%M"), "type": "technical", "notify_candidate": notify,
            "interviewers": [{"name": "Karim Tazi"}], "meet_link": link,
            "meeting": {"starts_at": starts_at.isoformat(), "duration_min": 45, "place": place, "visio_url": link}}
    return c.post("/api/entretiens", json=body, headers={"x-forwarded-host": "wedy.tython.ma", "x-forwarded-proto": "https"})


def body_of(msg) -> str:
    return "\n".join(p.get_content() for p in msg.walk() if p.get_content_type() in ("text/plain", "text/html"))


def test_planning_sends_the_invitation_with_the_details_and_a_calendar_file():
    c, db = client()
    start = datetime(2026, 11, 17, 10, 30, tzinfo=interview_mail.tz())  # HR types 10:30 (the browser sends the exact moment)
    r = plan(c, start)
    assert r.status_code == 200, r.text
    assert r.json()["email"] == {"sent": True, "to": "nadia@mail.ma", "error": None}
    msg = SENT[0]
    assert msg["To"] == "nadia@mail.ma" and "Invitation à un entretien" in msg["Subject"] and "mardi 17 novembre 2026" in msg["Subject"]
    text = body_of(msg)
    for part in ("Développeuse React", "10:30 – 11:15", "45 minutes", "Entretien technique", "Karim Tazi", "En visioconférence",
                 "Le lien pour rejoindre l'entretien vous sera envoyé par e-mail 15 minutes avant le début"):
        assert part in text, part
    ics = [p for p in msg.walk() if p.get_content_type() == "text/calendar"][0]
    cal = ics.get_content() if isinstance(ics.get_content(), str) else ics.get_content().decode()
    assert "METHOD:REQUEST" in cal and f"DTSTART:{start.astimezone(timezone.utc):%Y%m%dT%H%M%SZ}" in cal and "ATTENDEE;CN=Nadia Tazi" in cal
    row = db.tables["interviews"][0]
    assert row["invite_sent_at"] and row["public_base_url"] == "https://wedy.tython.ma" and row["reminder_sent_at"] is None


def test_no_e_mail_without_address_without_smtp_or_when_unticked():
    c, _ = client(email=None)
    assert plan(c, datetime.now(timezone.utc) + timedelta(days=1)).json()["email"]["error"].startswith("Le candidat n'a pas")
    c, _ = client()
    smtp(on=False)
    assert "pas encore configurés" in plan(c, datetime.now(timezone.utc) + timedelta(days=1)).json()["email"]["error"]
    c, _ = client()
    assert plan(c, datetime.now(timezone.utc) + timedelta(days=1), notify=False).json()["email"] is None and not SENT


def test_the_link_goes_out_15_minutes_before_once():
    c, db = client()
    now = datetime.now(timezone.utc).replace(microsecond=0)
    plan(c, now + timedelta(minutes=40))
    SENT.clear()
    assert interview_mail.send_due_reminders(db, now) == 0                       # 40 min before: too early
    assert interview_mail.send_due_reminders(db, now + timedelta(minutes=26)) == 1  # 14 min before
    msg = SENT[0]
    assert "lien pour vous connecter" in msg["Subject"]
    link = next(w for w in body_of(msg).split() if "/visio/m-" in w).strip('"<>')
    link = link[link.index("https://"):].split('"')[0]
    room, token = link.split("/visio/")[1].split("?k=")
    assert link.startswith("https://wedy.tython.ma/visio/m-") and visio._verify(token, room)["n"] == "Nadia Tazi"
    assert interview_mail.send_due_reminders(db, now + timedelta(minutes=27)) == 0   # already sent
    assert db.tables["interviews"][0]["reminder_sent_at"]


def test_no_link_for_an_interview_on_site_or_cancelled():
    c, db = client()
    now = datetime.now(timezone.utc)
    plan(c, now + timedelta(minutes=10), place="55 bd Zerktouni, Casablanca")
    assert "En présentiel" in body_of(SENT[0]) and "55 bd Zerktouni" in body_of(SENT[0])
    assert interview_mail.send_due_reminders(db, now) == 0
    c, db = client()
    iv = plan(c, now + timedelta(minutes=10)).json()
    SENT.clear()
    r = c.patch(f"/api/entretiens/{iv['id']}/status", params={"status": "cancelled"})
    assert r.json()["email"]["sent"] and "Entretien annulé" in SENT[0]["Subject"]
    cal = [p for p in SENT[0].walk() if p.get_content_type() == "text/calendar"][0].get_content()
    assert "METHOD:CANCEL" in (cal if isinstance(cal, str) else cal.decode())
    SENT.clear()
    assert interview_mail.send_due_reminders(db, now) == 0 and not SENT


def test_an_external_link_is_sent_as_it_is_and_a_failure_is_retried():
    c, db = client()
    now = datetime.now(timezone.utc)
    plan(c, now + timedelta(minutes=12), link="https://meet.google.com/abc-defg-hij")
    SENT.clear()

    def broken(msg):
        raise mailer.MailError("serveur indisponible")
    mailer.transport = broken
    assert interview_mail.send_due_reminders(db, now) == 0
    row = db.tables["interviews"][0]
    assert row["reminder_sent_at"] is None and "indisponible" in row["email_error"]
    mailer.transport = fake_transport
    assert interview_mail.send_due_reminders(db, now + timedelta(minutes=1)) == 1
    assert "https://meet.google.com/abc-defg-hij" in body_of(SENT[0]) and db.tables["interviews"][0]["email_error"] is None


def test_resend_and_status_endpoints():
    c, db = client()
    iv = plan(c, datetime.now(timezone.utc) + timedelta(days=2), notify=False).json()
    assert c.post(f"/api/entretiens/{iv['id']}/send-invite").json()["sent"] and len(SENT) == 1
    st = c.get("/api/entretiens/mail-status").json()
    assert st["configured"] and st["reminder_minutes"] == 15 and "rh@tython.ma" in st["from"]
    assert c.post("/api/integrations/mail/test").json() == {"sent": True, "to": "rh@tython.ma"} and SENT[-1]["To"] == "rh@tython.ma"



def test_the_default_settings_do_not_count_as_a_mail_server():
    smtp()
    settings.MAIL_SERVER, settings.MAIL_FROM, settings.MAIL_USERNAME, settings.MAIL_PASSWORD = "smtp.gmail.com", "noreply@tython.ma", "", ""
    assert not mailer.configured()
    os.environ["MAIL_NO_AUTH"] = "true"
    try:
        assert mailer.configured()  # a relay that only checks the IP
    finally:
        os.environ.pop("MAIL_NO_AUTH")
    settings.MAIL_USERNAME, settings.MAIL_PASSWORD = "rh@tython.ma", "x"
    assert mailer.configured()


def test_hr_sets_the_sending_account_in_wedy():
    """No server change: the account is typed in Intégrations › E-mails, tested, saved encrypted, then used."""
    c, db = client()
    smtp(on=False)                                   # nothing in the environment
    assert c.get("/api/integrations/mail").json()["configured"] is False
    account = {"server": "smtp.gmail.com", "port": 587, "security": "starttls", "username": "rh@tython.org",
               "password": "abcd efgh ijkl mnop", "sender_email": "rh@tython.org", "sender_name": "Tython RH"}

    def refused(msg):
        raise mailer.MailError("Identifiant ou mot de passe refusé par le serveur d'e-mails (535).")
    mailer.transport = refused
    r = c.put("/api/integrations/mail", json=account)
    assert r.status_code == 422 and "refusé" in r.json()["detail"] and not db.tables.get("app_settings")   # a bad password is not saved
    mailer.transport = fake_transport
    SENT.clear()
    r = c.put("/api/integrations/mail", json=account)
    assert r.status_code == 200, r.text
    st = r.json()
    assert st["configured"] and st["source"] == "platform" and st["test_sent_to"] == "rh@tython.ma" and "Tython RH" in st["from"]
    assert st["account"]["has_password"] and "password" not in st["account"] and SENT[0]["From"] == "Tython RH <rh@tython.org>"
    saved = db.tables["app_settings"][0]["value"]
    assert "abcd" not in str(saved) and mailer.unseal(saved["password_enc"]) == "abcd efgh ijkl mnop"
    # the interview invitation goes out from this account
    SENT.clear()
    out = plan(c, datetime.now(timezone.utc) + timedelta(days=1)).json()["email"]
    assert out["sent"] and SENT[0]["From"] == "Tython RH <rh@tython.org>"
    assert "rh@tython.org" in [p for p in SENT[0].walk() if p.get_content_type() == "text/calendar"][0].get_content()
    # a change without typing the password again keeps it
    r = c.put("/api/integrations/mail", json={**account, "password": "", "sender_name": "Tython Recrutement"})
    assert r.status_code == 200 and mailer.unseal(db.tables["app_settings"][0]["value"]["password_enc"]) == "abcd efgh ijkl mnop"
    assert c.get("/api/entretiens/mail-status").json()["from"] == "Tython Recrutement <rh@tython.org>"
    # removed: back to the environment (nothing there)
    assert c.delete("/api/integrations/mail").status_code == 204
    assert c.get("/api/integrations/mail").json()["configured"] is False


def test_the_smtp_connection_uses_the_account_settings():
    """The real sending path (no network: the SMTP classes are replaced) connects as the account says."""
    calls = []

    class FakeSMTP:
        def __init__(self, host, port, context=None, timeout=None): calls.append(("connect", type(self).__name__, host, port))
        def ehlo(self): pass
        def starttls(self, context=None): calls.append(("starttls",))
        def login(self, u, p): calls.append(("login", u, p))
        def send_message(self, msg): calls.append(("send", msg["To"]))
        def __enter__(self): return self
        def __exit__(self, *a): return False

    class FakeSMTP_SSL(FakeSMTP):
        pass

    real = (mailer.smtplib.SMTP, mailer.smtplib.SMTP_SSL, mailer.transport)
    mailer.smtplib.SMTP, mailer.smtplib.SMTP_SSL, mailer.transport = FakeSMTP, FakeSMTP_SSL, mailer._smtp_send
    try:
        gmail = mailer.Conf(server="smtp.gmail.com", port=587, security="starttls", username="rh@tython.org", password="app-pass",
                            sender_email="rh@tython.org", source="platform")
        mailer.send("nadia@mail.ma", "s", "<p>x</p>", "x", conf=gmail)
        assert calls == [("connect", "FakeSMTP", "smtp.gmail.com", 587), ("starttls",), ("login", "rh@tython.org", "app-pass"), ("send", "nadia@mail.ma")]
        calls.clear()
        ovh = mailer.Conf(server="ssl0.ovh.net", port=465, security="ssl", username="rh@tython.org", password="p", sender_email="rh@tython.org")
        mailer.send("nadia@mail.ma", "s", "<p>x</p>", "x", conf=ovh)
        assert calls[0] == ("connect", "FakeSMTP_SSL", "ssl0.ovh.net", 465) and ("starttls",) not in calls
    finally:
        mailer.smtplib.SMTP, mailer.smtplib.SMTP_SSL, mailer.transport = real

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
