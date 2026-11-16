"""Smart template import: the words of an uploaded document that change per person are found, mapped to Wedy data,
and filled at generation (salary in words, duration, civility, intern dates…). Fake database, no AI, no network:
    python backend/tests/test_template_import.py"""
import io
import json
import os
import sys
import tempfile

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.dirname(__file__))

from fakedb import FakeDB  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.config import settings  # noqa: E402
from app.database import get_db  # noqa: E402
from app.dependencies import get_current_user, require_hr_or_admin  # noqa: E402
from app.main import app  # noqa: E402
from app.routers.generate import build_context, render_template  # noqa: E402
from app.services import template_fields as tf  # noqa: E402

settings.UPLOAD_DIR = tempfile.mkdtemp(prefix="wedy-test-uploads-")
settings.DURABLE_STORAGE = False
USER = {"id": "11111111-2222-3333-4444-555555555555", "role_name": "hr", "email": "hr@t.ma"}

CONTRACT = [
    "CONTRAT DE TRAVAIL À DURÉE DÉTERMINÉE (CDD)",
    "Monsieur/Madame [Nom et Prénom], titulaire de la CIN n° [N° de CIN], demeurant à [Adresse de résidence], ci-après dénommé le Salarié.",
    "Le Salarié est recruté en qualité de [Intitulé du poste] pour une durée de [Durée du CDD], du [Date de début] au [Date de fin].",
    "Il travaillera selon un mode [Hybride (présentiel et télétravail)] et percevra [Salaire en chiffres] MAD ([Salaire en lettres] dirhams).",
    "Né le ________ à Casablanca. Fait à Casablanca, le [Date de rédaction].",
]


def client():
    db = FakeDB()
    db.tables["document_templates"] = []
    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[get_current_user] = lambda: USER
    app.dependency_overrides[require_hr_or_admin] = lambda: USER
    return TestClient(app), db


def make_pdf(lines):
    import fitz
    doc = fitz.open()
    page = doc.new_page()
    box = fitz.Rect(60, 60, 540, 800)
    page.insert_textbox(box, "\n\n".join(lines), fontsize=11, fontname="helv")  # long lines wrap: a bracket ends on the next line
    return doc.tobytes()


def make_docx(lines):
    from docx import Document
    d = Document()
    for ln in lines:
        p = d.add_paragraph()
        # Word cuts text into runs anywhere: split every bracket in two runs, the second one bold
        for i, part in enumerate(ln.split("[")):
            if i == 0:
                p.add_run(part)
                continue
            inner, _, rest = part.partition("]")
            p.add_run("[" + inner[: len(inner) // 2])
            p.add_run(inner[len(inner) // 2:] + "]").bold = True
            p.add_run(rest)
    buf = io.BytesIO()
    d.save(buf)
    return buf.getvalue()


EXPECTED = {
    "Monsieur/Madame": "civility", "[Nom et Prénom]": "full_name", "[N° de CIN]": "cin", "[Adresse de résidence]": "address",
    "[Intitulé du poste]": "position", "[Durée du CDD]": "duration", "[Date de début]": "contract_start", "[Date de fin]": "contract_end",
    "[Hybride (présentiel et télétravail)]": "work_mode", "[Salaire en chiffres]": "salary_figures",
    "[Salaire en lettres]": "salary_words", "[Date de rédaction]": "today",
}


def test_numbers_in_french_words():
    cases = {0: "zéro", 1: "un", 16: "seize", 17: "dix-sept", 21: "vingt et un", 22: "vingt-deux", 71: "soixante et onze",
             75: "soixante-quinze", 80: "quatre-vingts", 81: "quatre-vingt-un", 91: "quatre-vingt-onze", 100: "cent",
             200: "deux cents", 201: "deux cent un", 1000: "mille", 2000: "deux mille", 3500: "trois mille cinq cents",
             80000: "quatre-vingt mille", 200000: "deux cent mille", 1200000: "un million deux cent mille"}
    for n, words in cases.items():
        assert tf.number_to_french(n) == words, (n, tf.number_to_french(n))
    assert tf.salary_figures(3500) == "3 500" and tf.salary_figures("12500.5") == "12 500,50"
    assert tf.salary_words(3500.5) == "trois mille cinq cents virgule cinquante"


def test_duration_from_the_dates():
    assert tf.duration_text("2026-09-01", "2026-12-31") == "4 mois"
    assert tf.duration_text("19/08/2026", "19/11/2026") == "3 mois"          # end day counted or not: the same
    assert tf.duration_text("2026-01-01", "2026-12-31") == "1 an"
    assert tf.duration_text("2026-09-01", "2026-09-15") == "15 jours"
    assert tf.duration_text("2026-09-01", "2026-11-10") == "2 mois et 10 jours"
    assert tf.duration_text("2026-09-01", None) == "" and tf.duration_text("2026-09-01", "2026-08-01") == ""


def test_fields_are_found_even_split_between_tags():
    html = ('<p>Monsieur/Madame <b>[Nom et</b> Prénom], CIN n° [N° de <i>CIN</i>]</p>'
            '<p>Salaire : [Salaire en chiffres] MAD ([Salaire en lettres] dirhams), [1] ref, né le ________.</p>'
            '<p>Déjà là : {{matricule}} · [Champ inconnu du modèle]</p><style>.x{content:"[Nom et Prénom]"}</style>')
    fields = {f["placeholder"]: f for f in tf.analyse_html(html)}
    assert fields["[Nom et Prénom]"]["key"] == "full_name" and fields["[N° de CIN]"]["key"] == "cin"
    assert fields["[Salaire en chiffres]"]["key"] == "salary_figures" and fields["[Salaire en lettres]"]["key"] == "salary_words"
    assert fields["Monsieur/Madame"]["key"] == "civility" and fields["{{matricule}}"]["key"] == "matricule"
    assert fields["________"]["key"] == "birth_date"                     # a blank is named by the words before it
    assert fields["[Champ inconnu du modèle]"]["key"] == "f_champ_inconnu_du_modele" and not fields["[Champ inconnu du modèle]"]["known"]
    assert "[1]" not in fields                                            # a reference, not a field
    out = tf.apply_fields(html)
    assert "{{full_name}}" in out and "{{cin}}" in out and "[Nom et" not in out.split("<style>")[0]
    assert '"[Nom et Prénom]"' in out                                     # the stylesheet is left alone
    kept = tf.apply_fields(html, {"[N° de CIN]": tf.KEEP, "[Nom et Prénom]": "manager"})
    assert "[N° de " in kept and "{{manager}}" in kept and "{{cin}}" not in kept


def test_meta_keeps_the_custom_fields_labels_and_defaults():
    fields = [{"key": "f_lieu", "label": "Lieu de travail", "default": ""}, {"key": "work_mode", "label": "Hybride", "default": "Hybride"},
              {"key": "full_name", "label": "Nom", "default": ""}]
    body = tf.with_meta("<p>x</p>", fields)
    assert tf.read_meta(body) == {"f_lieu": {"label": "Lieu de travail", "default": ""}, "work_mode": {"label": "Hybride", "default": "Hybride"}}
    assert tf.strip_meta(body) == "<p>x</p>" and tf.read_meta(tf.with_meta(body, fields)) == tf.read_meta(body)


def _check_import(c, content, filename):
    r = c.post("/api/templates/preview-import", files={"file": (filename, content)})
    assert r.status_code == 200, r.text
    got = {f["placeholder"]: f["key"] for f in r.json()["fields"]}
    for ph, key in EXPECTED.items():
        assert got.get(ph) == key, (filename, ph, got.get(ph), got)
    assert "[" not in r.json()["body_template"].split("-->", 1)[-1].replace("[1]", "")
    return r.json()


def test_a_text_pdf_is_imported_with_all_its_fields():
    c, _ = client()
    body = _check_import(c, make_pdf(CONTRACT), "contrat.pdf")["body_template"]
    assert "<img" not in body and "position:absolute" not in body           # flowing text, not a page image
    assert tf.read_meta(body)["work_mode"]["default"] == "Hybride (présentiel et télétravail)"


def test_a_word_document_is_imported_with_all_its_fields():
    c, _ = client()
    _check_import(c, make_docx(CONTRACT), "contrat.docx")


def test_import_saves_the_template_with_the_users_corrections():
    c, db = client()
    r = c.post("/api/templates/import", files={"file": ("contrat.docx", make_docx(CONTRACT))},
               data={"name_fr": "Contrat CDD", "category": "contrat", "target_type": "intern",
                     "mapping": json.dumps({"[Adresse de résidence]": "city", "[N° de CIN]": tf.KEEP})})
    assert r.status_code == 201, r.text
    row = db.tables["document_templates"][0]
    assert row["target_type"] == "intern" and "city" in row["variables"] and "address" not in row["variables"] and "cin" not in row["variables"]
    import re as _re
    text = _re.sub(r"<[^>]+>", "", row["body_template"])
    assert "[N° de CIN]" in text and "{{civility}}" in text                # kept as written (Word split it in two runs)
    assert c.post("/api/templates/import", files={"file": ("x.docx", b"x")}, data={"name_fr": "x", "mapping": "{bad"}).status_code == 422


def test_generation_fills_an_intern_contract():
    body = tf.with_meta("<p>{{civility}} {{full_name}} {{cin}} — {{position}} — {{duration}} du {{contract_start}} au {{contract_end}} — "
                        "{{salary_figures}} MAD ({{salary_words}} dirhams) — {{work_mode}} — {{f_lieu}}</p>",
                        [{"key": "work_mode", "label": "Hybride", "default": "Hybride (présentiel et télétravail)"},
                         {"key": "f_lieu", "label": "Lieu", "default": ""}])
    intern = {"full_name": "Nadia Tazi", "status": "intern", "position": "Développeuse", "internship_start": "2026-09-01",
              "internship_end": "2026-12-31", "remuneration": 2500, "custom_fields": {}}
    ctx = build_context(intern, {"cin": "AB123456", "f_lieu": "Casablanca"}, None, tf.read_meta(body))
    out = render_template(tf.strip_meta(body), ctx)
    assert out == ("<p>Monsieur/Madame Nadia Tazi AB123456 — Développeuse — 4 mois du 01/09/2026 au 31/12/2026 — "
                   "2 500 MAD (deux mille cinq cents dirhams) — Hybride (présentiel et télétravail) — Casablanca</p>"), out
    typed = build_context(intern, {"civility": "Madame", "salary_figures": "3000", "contract_end": "30/11/2026"}, None, {})
    assert (typed["civility"], typed["salary_figures"], typed["salary_words"], typed["duration"]) == ("Madame", "3 000", "trois mille", "3 mois")
    employee = build_context({"full_name": "X", "status": "active", "salary": 18500, "hire_date": "2024-01-01"}, {}, None, {})
    assert employee["salary"] == "18,500.00 MAD" and employee["salary_words"] == "dix-huit mille cinq cents" and employee["contract_end"] == "à ce jour"


def make_attestation_pdf():
    """An attestation like the real one: a logo, a centred title, short lines, a signature block on the right."""
    import fitz
    from PIL import Image
    buf = io.BytesIO(); Image.new("RGB", (400, 90), (90, 30, 120)).save(buf, "PNG")
    doc = fitz.open(); page = doc.new_page()          # A4 portrait, 595 x 842
    page.insert_image(fitz.Rect(72, 60, 290, 110), stream=buf.getvalue())
    title_w = fitz.get_text_length("ATTESTATION DE STAGE", fontname="tibo", fontsize=18)
    page.insert_text(((72 + 523) / 2 - title_w / 2, 190), "ATTESTATION DE STAGE", fontsize=18, fontname="tibo")
    body = ("Je soussignée, Madame Widad, Directrice des Ressources Humaines au sein de la société TYTHON SARL, "
            "certifie que M./Mme [Nom et Prénom], a effectué un stage au sein de notre entreprise du [Date de début] "
            "jusqu'au [Date de fin]. Durant cette période, il/elle a été intégré(e) à nos équipes.")
    page.insert_textbox(fitz.Rect(72, 220, 523, 330), body, fontsize=12, fontname="tiro")
    page.insert_text((72, 380), "Fait à Casablanca, le [Date de rédaction]", fontsize=12, fontname="tiro")
    for k, line in enumerate(["TYTHON SARL", "Mme Widad", "Directrice RH"]):
        page.insert_text((72, 420 + k * 16), line, fontsize=12, fontname="tibo")
    page.insert_text((363, 500), "Signature et cachet", fontsize=12, fontname="tibo")
    page.insert_text((352, 516), "Madame Samira Hajji", fontsize=12, fontname="tibo")
    return doc.tobytes()


def test_a_pdf_keeps_its_logo_title_lines_and_signature_block():
    from app.services.pdf_template_extractor import extract_template_smart
    html = extract_template_smart(make_attestation_pdf(), "attestation.pdf")
    assert "<img" in html and "data:image/png;base64," in html             # the logo is kept, as a picture of its area
    assert "Times New Roman" in html                                       # the document's (serif) font
    import re as _re
    title = _re.search(r"<(h\d|p) style=\"([^\"]*)\">(?:<strong>)?ATTESTATION DE STAGE", html)
    assert title and "text-align:center" in title.group(2)                 # the centred title stays centred
    assert "TYTHON SARL</strong><br><strong>Mme Widad</strong><br><strong>Directrice RH" in html.replace("</strong><strong>", "")
    assert "Signature et cachet</strong><br><strong>Madame Samira Hajji" in html and "margin-inline-start" in html
    fields = {f["placeholder"]: f["key"] for f in tf.analyse_html(html)}
    assert fields["M./Mme"] == "civility_short" and fields["[Nom et Prénom]"] == "full_name" and fields["[Date de rédaction]"] == "today"


def test_the_text_agrees_with_the_civility():
    html = "<p>Il/Elle a été intégré(e) ; l'intéressé(e) <b>né(e)</b> le ; il/elle est salarié(e)s.</p>"
    assert tf.agree(html, "Madame") == "<p>Elle a été intégrée ; l'intéressée <b>née</b> le ; elle est salariées.</p>"
    assert tf.agree(html, "Monsieur") == "<p>Il a été intégré ; l'intéressé <b>né</b> le ; il est salariés.</p>"
    assert tf.agree(html, "Monsieur/Madame") == html                       # unknown: left as written
    ctx = build_context({"full_name": "X", "status": "intern"}, {"civility_short": "Mme"}, None, {})
    assert (ctx["civility"], ctx["civility_short"]) == ("Madame", "Mme")
    assert build_context({"full_name": "X"}, {}, None, {})["civility_short"] == "M./Mme"



def test_deleting_a_template_keeps_the_documents_made_with_it():
    c, db = client()
    db.tables["document_templates"] = [{"id": "t1", "name_fr": "ATTESTATION DE STAGRE", "code": "att", "body_template": "<p>x</p>"},
                                       {"id": "t2", "name_fr": "ATTESTATION DE TRAVAIL", "code": "att2", "body_template": "<p>y</p>"}]
    db.tables["generated_documents"] = [{"id": "d1", "template_id": "t1", "document_type": "attestation"},
                                        {"id": "d2", "template_id": "t2", "document_type": "attestation"}]
    assert c.delete("/api/templates/t1").status_code == 204
    assert [t["id"] for t in db.tables["document_templates"]] == ["t2"]
    assert {d["id"]: d["template_id"] for d in db.tables["generated_documents"]} == {"d1": None, "d2": "t2"}
    assert c.delete("/api/templates/t1").status_code == 404

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
