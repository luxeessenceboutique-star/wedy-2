"""Spelling clean-up of the job-post form, with a scripted model (never the real one):  python backend/tests/test_ad_polish.py"""
import asyncio
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.dirname(__file__))

from fastapi.testclient import TestClient  # noqa: E402

from app.dependencies import get_current_user  # noqa: E402
from app.main import app  # noqa: E402
from app.routers import copilot as copilot_router  # noqa: E402
from app.services import ad_text  # noqa: E402


def with_model(answer):
    """Make the app's chat model answer `answer` (a string, or an Exception to raise). Returns the undo."""
    real = copilot_router._call_ai
    def fake(system, messages):
        fake.seen = messages[0]["content"]
        if isinstance(answer, Exception):
            raise answer
        return answer if isinstance(answer, str) else json.dumps(answer, ensure_ascii=False)
    copilot_router._call_ai = fake
    return fake, lambda: setattr(copilot_router, "_call_ai", real)


def run(title="", city="", points=""):
    return asyncio.run(ad_text.polish(title, city, points))


def test_the_models_corrections_are_applied_and_reported():
    fake, undo = with_model({"title": "Developer AI", "city": "Casablanca", "points": "3 ans d'expérience, anglais courant"})
    try:
        r = run("devloper ai", "casa", "3 ans d experiance, anglais courent")
    finally:
        undo()
    assert (r["title"], r["city"], r["points"]) == ("Developer AI", "Casablanca", "3 ans d'expérience, anglais courant")
    assert r["source"] == "ai" and r["changed"] and [c["field"] for c in r["changes"]] == ["title", "city", "points"]
    assert r["changes"][0] == {"field": "title", "from": "devloper ai", "to": "Developer AI"}
    assert "devloper ai" in fake.seen                       # what was typed is what the model saw


def test_a_rewrite_or_a_changed_number_is_refused_field_by_field():
    _, undo = with_model({"title": "Directeur général du groupe international", "city": "Rabat", "points": "5 ans d'expérience"})
    try:
        r = run("directure commercial", "rbat", "3 ans d experiance")
    finally:
        undo()
    assert r["title"] == "Directure commercial"             # too far from what was typed: only the deterministic capital letter
    assert r["city"] == "Rabat"                              # a good correction is kept
    assert r["points"] == "3 ans d experiance"               # "3" became "5": refused


def test_empty_fields_stay_empty_whatever_the_model_says():
    _, undo = with_model({"title": "Chef de projet", "city": "Casablanca", "points": "Autonomie, rigueur"})
    try:
        r = run("chef de projet", "", "")
    finally:
        undo()
    assert r["city"] == "" and r["points"] == "" and r["title"] == "Chef de projet"


def test_without_the_model_a_deterministic_clean_up_still_helps():
    _, undo = with_model(RuntimeError("no model"))
    try:
        r = run("  devloper   ai ", "casa", "react,  node.js\n  anglais courant")
    finally:
        undo()
    assert r["source"] == "local" and r["title"] == "Devloper ai" and r["city"] == "Casablanca"
    assert r["points"] == "React, node.js\nAnglais courant"      # spaces collapsed, first capital letters; no spelling guess without the model


def test_garbage_from_the_model_changes_nothing_but_the_clean_up():
    _, undo = with_model("Sorry, I cannot help with that.")
    try:
        r = run("comptable", "fes", "")
    finally:
        undo()
    assert r["source"] == "local" and r["title"] == "Comptable" and r["city"] == "Fès"


def test_already_correct_values_are_returned_unchanged():
    _, undo = with_model({"title": "Développeur full stack", "city": "Casablanca", "points": "React, Python"})
    try:
        r = run("Développeur full stack", "Casablanca", "React, Python")
    finally:
        undo()
    assert r["changed"] is False and r["changes"] == []


def test_endpoint():
    app.dependency_overrides[get_current_user] = lambda: {"id": "11111111-2222-3333-4444-555555555555", "role_name": "hr", "email": "hr@t.ma"}
    _, undo = with_model({"title": "Directeur commercial", "city": "Casablanca", "points": ""})
    try:
        r = TestClient(app).post("/api/annonces/polish", json={"title": "directure commercial", "city": "casa", "points": "", "language": "fr"})
    finally:
        undo(); app.dependency_overrides.clear()
    assert r.status_code == 200 and r.json()["title"] == "Directeur commercial" and r.json()["city"] == "Casablanca" and r.json()["changed"] is True


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
