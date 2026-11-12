"""Événements: scanned CVs → pool → candidates (fake database, fake extraction: no AI, no network):  python backend/tests/test_cv_events.py"""
import os
import sys
import tempfile
from datetime import date

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.dirname(__file__))

from fakedb import FakeDB  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.config import settings  # noqa: E402
from app.database import get_db  # noqa: E402
from app.dependencies import get_current_user  # noqa: E402
from app.main import app  # noqa: E402
from app.services import cv_pool  # noqa: E402

settings.UPLOAD_DIR = tempfile.mkdtemp(prefix="wedy-test-uploads-")
settings.DURABLE_STORAGE = False
HR = {"id": "11111111-2222-3333-4444-555555555555", "role_name": "hr", "email": "hr@t.ma"}
AD = "00000000-0000-4000-8000-0000000000a1"
PDF = b"%PDF-1.4 fake cv"

EXTRACTIONS = {
    "ahmed.pdf": {"full_name": "Ahmed Alaoui", "email": "Ahmed.Alaoui@Gmail.com", "phone": "06 12 34 56 78", "address": "12 rue Ibn Sina, Casablanca 20000, Maroc",
                  "job_title": "Développeur Full Stack", "summary": "5 ans de développement web.", "skills": ["React", "Python", "react", "SQL"],
                  "experience": [{"title": "Dev", "company": "A", "dates": "2019 - 2022", "description": ""}, {"title": "Dev", "company": "B", "dates": "2021 - Présent", "description": ""}],
                  "education": [{"degree": "Master", "institution": "ENSIAS", "dates": "2019"}], "languages": [{"name": "Français", "level": "Courant"}],
                  "certifications": [], "interests": "", "nationality": "Marocaine", "ai_used": True},
    "sara.pdf": {"full_name": "Sara Bennani", "email": "sara@t.ma", "phone": "+212 6 61 22 33 44", "job_title": "Comptable", "skills": ["Sage"], "experience": [], "ai_used": False},
    "ahmed-again.pdf": {"full_name": "Ahmed A.", "email": "ahmed.alaoui@gmail.com", "phone": None, "skills": [], "experience": [], "ai_used": True},
    "phone-twin.pdf": {"full_name": "Hamza", "email": None, "phone": "+212612345678", "skills": [], "experience": [], "ai_used": True},
    "blank.pdf": {"full_name": None, "email": None, "phone": None, "skills": [], "experience": [], "ai_used": True},
}


def fake_extract(content, filename):
    if filename == "boom.pdf":
        raise RuntimeError("model down")
    return dict(EXTRACTIONS[filename])


def setup(user=HR):
    db = FakeDB()
    db.tables["recruitment_ads"] = [{"id": AD, "poste": "Développeur Full Stack", "is_active": True}, {"id": "00000000-0000-4000-8000-0000000000a2", "poste": "Fermée", "is_active": False}]
    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[get_current_user] = lambda: user
    real = cv_pool.extract_cv_file
    cv_pool.extract_cv_file = fake_extract
    def undo():
        cv_pool.extract_cv_file = real
        app.dependency_overrides.clear()
    return TestClient(app), db, undo


def new_event(c, name="Forum Emploi Casablanca"):
    r = c.post("/api/cv-events", json={"name": name, "event_date": "2026-11-20", "location": "Casablanca"})
    assert r.status_code == 201, r.text
    return r.json()["id"]


def scan(c, event, name, content=PDF):
    return c.post(f"/api/cv-events/{event}/scan", files={"file": (name, content, "application/pdf")})


def test_events_are_created_validated_and_counted():
    c, db, undo = setup()
    try:
        assert c.post("/api/cv-events", json={"name": "Forum", "event_date": "20/11/2026"}).status_code == 422
        assert c.post("/api/cv-events", json={"name": "x"}).status_code == 422
        ev = new_event(c)
        scan(c, ev, "ahmed.pdf"); scan(c, ev, "sara.pdf")
        listed = c.get("/api/cv-events").json()
        assert listed[0]["id"] == ev and (listed[0]["total"], listed[0]["shortlisted"], listed[0]["converted"]) == (2, 0, 0)
        assert c.patch(f"/api/cv-events/{ev}", json={"name": "Forum 2026", "location": "Rabat"}).json()["name"] == "Forum 2026"
    finally:
        undo()


def test_a_scanned_cv_becomes_a_complete_prospect_and_the_file_is_kept():
    c, db, undo = setup()
    try:
        ev = new_event(c)
        r = scan(c, ev, "ahmed.pdf")
        assert r.status_code == 201
        p = r.json()
        assert p["full_name"] == "Ahmed Alaoui" and p["email"] == "ahmed.alaoui@gmail.com"          # e-mail lower-cased
        assert p["phone"] == "06 12 34 56 78" and p["city"] == "Casablanca" and p["headline"] == "Développeur Full Stack"
        assert p["skills"] == ["React", "Python", "SQL"]                                          # « react » twice is one skill
        assert p["years_experience"] is not None and p["years_experience"] >= 5                    # 2019 → present, overlapping jobs counted once
        assert p["profile"]["education"][0]["institution"] == "ENSIAS" and p["extraction"] == "ok" and p["status"] == "new"
        assert os.path.isfile(os.path.join(settings.UPLOAD_DIR, p["file_path"])) and p["file_name"] == "ahmed.pdf"
        assert c.get(f"/api/cv-events/{ev}/prospects").json()[0]["id"] == p["id"]
    finally:
        undo()


def test_without_the_ai_the_cv_is_marked_partial_and_a_failing_extraction_keeps_the_file():
    c, db, undo = setup()
    try:
        ev = new_event(c)
        assert scan(c, ev, "sara.pdf").json()["extraction"] == "partial"
        failed = scan(c, ev, "boom.pdf").json()
        assert failed["extraction"] == "failed" and "Extraction impossible" in failed["extraction_error"]
        assert failed["full_name"] == "Boom" and os.path.isfile(os.path.join(settings.UPLOAD_DIR, failed["file_path"]))   # the file can still be opened
        blank = scan(c, ev, "blank.pdf").json()
        assert blank["extraction"] == "failed" and "identité" in blank["extraction_error"]
    finally:
        undo()


def test_bad_files_are_refused_with_a_reason():
    c, db, undo = setup()
    try:
        ev = new_event(c)
        assert scan(c, ev, "cv.exe").status_code == 415
        assert scan(c, ev, "empty.pdf", content=b"").status_code == 422
        real = cv_pool.MAX_FILE_BYTES
        cv_pool.MAX_FILE_BYTES = 10
        try:
            assert scan(c, ev, "ahmed.pdf").status_code == 413
        finally:
            cv_pool.MAX_FILE_BYTES = real
        assert c.post("/api/cv-events/00000000-0000-4000-8000-0000000000ff/scan", files={"file": ("ahmed.pdf", PDF, "application/pdf")}).status_code == 404
        assert db.tables.get("cv_prospects", []) == []
    finally:
        undo()


def test_the_same_person_scanned_twice_is_flagged():
    c, db, undo = setup()
    try:
        ev = new_event(c); ev2 = new_event(c, "Salon de l'étudiant")
        first = scan(c, ev, "ahmed.pdf").json()
        again = scan(c, ev2, "ahmed-again.pdf").json()                    # same e-mail, other event
        assert again["duplicate_of"] == first["id"] and again["duplicate_name"] == "Ahmed Alaoui"
        a = scan(c, ev, "sara.pdf").json()
        assert a["duplicate_of"] is None                                  # Sara's number and e-mail are new
        twin = scan(c, ev, "phone-twin.pdf").json()                       # "+212612345678" is Ahmed's "06 12 34 56 78" written the international way
        assert twin["duplicate_of"] == first["id"] and twin["duplicate_name"] == "Ahmed Alaoui"
        assert cv_pool.norm_phone("00212 6 12 34 56 78") == cv_pool.norm_phone("0612345678") == "212612345678"
        assert cv_pool.find_duplicate([{"id": "x", "phone": "06 61 22 33 44"}], None, "+212 661 22 33 45") is None   # one digit apart: another person
    finally:
        undo()


def test_years_of_experience_are_estimated_from_the_dates():
    today = date(2026, 11, 10)
    est = lambda *d: cv_pool.estimate_years([{"dates": x} for x in d], today)  # noqa: E731
    assert est("2019 - 2022") == 3.0
    assert est("2019 - 2022", "2021 - 2024") == 5.0                      # the two years of overlap are counted once
    assert est("Jan 2020 – Présent") == 6.0 and est("depuis 2021 à ce jour") == 5.0
    assert est("2018 - 2019", "2022 - 2023") == 2.0                      # a gap is not experience
    assert est("stage d'été") is None and est() is None
    assert est("2030 - 2040") is None and est("2019 - 2022", "2030 - 2040") == 3.0     # a period in the future is ignored


def test_corrections_status_and_rating_are_saved_and_checked():
    c, db, undo = setup()
    try:
        ev = new_event(c)
        pid = scan(c, ev, "sara.pdf").json()["id"]
        r = c.patch(f"/api/cv-prospects/{pid}", json={"full_name": "  Sara  Bennani ", "email": "SARA@T.MA", "status": "shortlisted", "rating": 4, "skills": ["Sage", " ", "Excel"], "notes": "À rappeler"})
        assert r.status_code == 200
        row = db.tables["cv_prospects"][0]
        assert (row["full_name"], row["email"], row["status"], row["rating"], row["skills"]) == ("Sara Bennani", "sara@t.ma", "shortlisted", 4, ["Sage", "Excel"])
        assert c.patch(f"/api/cv-prospects/{pid}", json={"status": "hired"}).status_code == 422
        assert c.patch(f"/api/cv-prospects/{pid}", json={"status": "converted"}).status_code == 422       # only the conversion does that
        assert c.patch(f"/api/cv-prospects/{pid}", json={"rating": 9}).status_code == 422
        assert c.get("/api/cv-events").json()[0]["shortlisted"] == 1
    finally:
        undo()


def test_converting_creates_a_candidate_with_the_cv_and_the_job_post():
    c, db, undo = setup()
    try:
        ev = new_event(c)
        pid = scan(c, ev, "ahmed.pdf").json()["id"]
        r = c.post("/api/cv-prospects/convert", json={"ids": [pid], "ad_id": AD})
        assert r.status_code == 200 and r.json()["converted"] == 1
        cand = db.tables["employees"][0]
        assert cand["status"] == "candidate" and cand["full_name"] == "Ahmed Alaoui" and cand["email"] == "ahmed.alaoui@gmail.com"
        assert cand["position"] == "Développeur Full Stack" and cand["city"] == "Casablanca" and cand["nationality"] == "Marocaine"
        cf = cand["custom_fields"]
        assert cf["recruitment_stage"] == "new" and cf["ad_id"] == AD and cf["source"] == "Événement · Forum Emploi Casablanca"
        assert cf["event_id"] == ev and cf["prospect_id"] == pid and cf["cv_profile"]["education"][0]["institution"] == "ENSIAS"
        f = db.tables["employee_files"][0]                                   # the CV is in the candidate's own folder
        assert f["employee_id"] == cand["id"] and f["file_type"] == "cv" and f["file_path"].startswith(f"employees/{cand['id']}/") and f["name"] == "ahmed.pdf"
        assert open(os.path.join(settings.UPLOAD_DIR, f["file_path"]), "rb").read() == PDF
        prospect = db.tables["cv_prospects"][0]
        assert prospect["status"] == "converted" and prospect["candidate_id"] == cand["id"]
        assert c.get("/api/cv-events").json()[0]["converted"] == 1
    finally:
        undo()


def test_conversion_reports_each_cv_and_never_creates_doubles():
    c, db, undo = setup()
    try:
        ev = new_event(c)
        a = scan(c, ev, "ahmed.pdf").json()["id"]; s = scan(c, ev, "sara.pdf").json()["id"]; blank = scan(c, ev, "blank.pdf").json()["id"]
        db.tables["employees"] = [{"id": "e-staff", "email": "sara@t.ma", "status": "active"}]            # Sara already works here
        r = c.post("/api/cv-prospects/convert", json={"ids": [a, s, blank, "00000000-0000-4000-8000-0000000000ff"]}).json()
        by = {x["id"]: x for x in r["results"]}
        assert by[a]["ok"] and by[s]["error"] == "already_known" and by[s]["candidate_id"] == "e-staff" and by[s]["known_as"] == "active"
        assert by[blank]["error"] == "needs_review"                        # nothing readable in that CV: a person must fix the identity first
        assert by["00000000-0000-4000-8000-0000000000ff"]["error"] == "not_found" and r["converted"] == 1
        c.patch(f"/api/cv-prospects/{blank}", json={"full_name": "Youssef Idrissi"})          # reading the CV and typing the name makes it convertible
        assert c.post("/api/cv-prospects/convert", json={"ids": [blank]}).json()["converted"] == 1
        again = c.post("/api/cv-prospects/convert", json={"ids": [a]}).json()["results"][0]
        assert again["error"] == "already_converted" and len([e for e in db.tables["employees"] if e["status"] == "candidate"]) == 2
    finally:
        undo()


def test_a_candidate_may_apply_to_another_job_post_but_not_twice_to_the_same():
    c, db, undo = setup()
    try:
        ev = new_event(c)
        a = scan(c, ev, "ahmed.pdf").json()["id"]
        db.tables["employees"] = [{"id": "e1", "email": "ahmed.alaoui@gmail.com", "status": "candidate", "custom_fields": {"ad_id": "00000000-0000-4000-8000-0000000000bb"}}]
        assert c.post("/api/cv-prospects/convert", json={"ids": [a], "ad_id": AD}).json()["converted"] == 1      # another job post: a new application
        b = scan(c, ev, "ahmed-again.pdf").json()["id"]
        assert c.post("/api/cv-prospects/convert", json={"ids": [b], "ad_id": AD}).json()["results"][0]["error"] == "already_known"   # same job post
    finally:
        undo()


def test_conversion_checks_the_job_post():
    c, db, undo = setup()
    try:
        ev = new_event(c)
        a = scan(c, ev, "ahmed.pdf").json()["id"]
        assert c.post("/api/cv-prospects/convert", json={"ids": [a], "ad_id": "00000000-0000-4000-8000-0000000000a2"}).status_code == 404   # closed
        assert c.post("/api/cv-prospects/convert", json={"ids": [a], "ad_id": "00000000-0000-4000-8000-0000000000ff"}).status_code == 404   # unknown
        assert c.post("/api/cv-prospects/convert", json={"ids": []}).status_code == 422
        assert db.tables.get("employees", []) == []
    finally:
        undo()


def test_deleting_a_cv_or_an_event_removes_the_files_but_keeps_the_candidates():
    c, db, undo = setup()
    try:
        ev = new_event(c)
        a = scan(c, ev, "ahmed.pdf").json(); s = scan(c, ev, "sara.pdf").json()
        c.post("/api/cv-prospects/convert", json={"ids": [a["id"]]})
        path_a, path_s = os.path.join(settings.UPLOAD_DIR, a["file_path"]), os.path.join(settings.UPLOAD_DIR, s["file_path"])
        assert c.delete(f"/api/cv-prospects/{s['id']}").status_code == 204 and not os.path.exists(path_s)
        assert c.delete(f"/api/cv-events/{ev}").status_code == 204
        assert not os.path.exists(path_a) and db.tables["cv_prospects"] == [] and db.tables["cv_events"] == []
        cand = db.tables["employees"][0]
        assert os.path.isfile(os.path.join(settings.UPLOAD_DIR, db.tables["employee_files"][0]["file_path"])) and cand["status"] == "candidate"
    finally:
        undo()


def test_only_hr_can_use_the_pool():
    c, db, undo = setup(user={"id": "u2", "role_name": "employee", "email": "e@t.ma"})
    try:
        assert c.get("/api/cv-events").status_code == 403
        assert c.post("/api/cv-events", json={"name": "Forum"}).status_code == 403
        assert c.post("/api/cv-prospects/convert", json={"ids": ["00000000-0000-4000-8000-0000000000ff"]}).status_code == 403
    finally:
        undo()


def test_the_real_extraction_reads_a_pdf_without_any_ai():
    """A real PDF through the real text extraction and the rule-based fallback (the AI keys are blanked: no network, no cost)."""
    import fitz
    keep = (settings.ANTHROPIC_API_KEY, settings.OPENAI_API_KEY)
    settings.ANTHROPIC_API_KEY = settings.OPENAI_API_KEY = ""
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((60, 80), "Karim BENJELLOUN", fontsize=20)
    page.insert_text((60, 110), "Ingénieur logiciel", fontsize=12)
    y = 140
    for line in ("Email : karim.benjelloun@example.com", "Téléphone : +212 6 12 34 56 78", "Casablanca, Maroc", "", "COMPÉTENCES", "Python, React, SQL, Docker",
                 "", "EXPÉRIENCE", "Développeur backend - Société X (2018 - 2022)", "Ingénieur logiciel - Société Y (2022 - Présent)", "", "FORMATION", "Master informatique - ENSIAS (2018)"):
        page.insert_text((60, y), line, fontsize=11); y += 16
    pdf = doc.tobytes()
    try:
        out = cv_pool.extract_cv_file(pdf, "karim.pdf")
    finally:
        settings.ANTHROPIC_API_KEY, settings.OPENAI_API_KEY = keep
    f = cv_pool.prospect_fields(out, "karim.pdf")
    assert out["ai_used"] is False
    assert f["email"] == "karim.benjelloun@example.com" and f["phone"] == "+212 6 12 34 56 78"
    assert f["full_name"] and "karim" in f["full_name"].lower() and f["city"] == "Casablanca" and "Python" in f["skills"]
    jobs = out["experience"]
    assert [j["company"] for j in jobs] == ["Société X", "Société Y"] and jobs[1]["dates"] == "2022 - Présent"      # « Présent » is kept, no stray bracket
    assert f["years_experience"] is not None and f["years_experience"] >= 8                                        # 2018 → today
    assert out["education"][0]["institution"] == "ENSIAS"


def test_moroccan_phone_numbers_are_read_however_they_are_written():
    from app.services.cv_parser import PHONE_RE
    for text in ("+212 6 12 34 56 78", "06 12 34 56 78", "0612345678", "(+212) 612-345-678", "00212612345678", "Tél : 07.12.34.56.78", "05 22 33 44 55"):
        assert PHONE_RE.search(text), text
    for text in ("CIN 1234567890123", "ref 06123456789012", "2019 2022"):          # long digit runs and years are not phone numbers
        assert not PHONE_RE.search(text), text


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
