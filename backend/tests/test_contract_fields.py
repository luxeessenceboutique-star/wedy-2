"""Importing a real-looking employment contract already filled for someone (all names here are invented):
the employee's details become fields, the company's own details (its block « Entre les soussignés … d'une part »,
the manager who signs for it, its RC / ICE / CNSS) stay as they are; a watermark and the noise of a scan are left
out. No AI, no network:  python backend/tests/test_contract_fields.py"""
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
from app.services.pdf_template_extractor import SCAN_MARK, extract_template_smart  # noqa: E402

settings.UPLOAD_DIR = tempfile.mkdtemp(prefix="wedy-test-uploads-")
settings.DURABLE_STORAGE = False
USER = {"id": "11111111-2222-3333-4444-555555555555", "role_name": "hr", "email": "hr@t.ma"}

CDD = [
    "CONTRAT DE TRAVAIL À DURÉE DÉTERMINÉE (CDD)",
    "Entre les soussignés :",
    "ACME SARL, société de droit marocain, dont le siège social est situé à 12 RUE EXEMPLE CASABLANCA, représentée par "
    "M.KARIM ALAMI SEFRIOUI, GERANT, ci-après dénommée « l'Employeur »,",
    "D'une part,",
    "Et",
    "Monsieur/Madame Sara BENNANI, titulaire de la CIN n° XY987654, demeurant à Rabat, ci-après dénommé « le Salarié »",
    "D'autre part,",
    "Il a été convenu ce qui suit :",
    "Le Salarié est recruté en qualité de DEV FULL STACK - INGENIEUR LOGICIEL afin de répondre à un besoin temporaire.",
    "Le présent contrat est conclu pour une durée déterminée de 3 mois, prenant effet le 19/08/2026 et arrivant "
    "automatiquement à échéance le 19/11/2026, sauf renouvellement.",
    "Le présent contrat est soumis à une période d'essai de 15 jours.",
    "Le Salarié exercera les fonctions de DEV FULL STACK - INGENIEUR LOGICIEL.",
    "Le Salarié exercera ses fonctions selon un mode de travail Hybride (présentiel et télétravail), alternant présence et travail à distance.",
    "En contrepartie de son travail, le Salarié percevra un salaire mensuel brut de :",
    "3 000 MAD (trois mille dirhams).",
    "Tous les livrables seront la propriété exclusive de ACME SARL.",
    "Fait à Casablanca, le 15/11/2026",
    "M.KARIM ALAMI SEFRIOUI",
    "Monsieur/Madame",
    "Sara BENNANI",
]

# what the OCR of a scanned CDI gives: no accents, « l’ » read as F / 1 / I, no date (handwritten)
CDI_SCAN = [
    "Contrat de travail (CDI)",
    "Entre les soussignes :",
    "La societe : ACME",
    "Siege social: 12 BD EXEMPLE 1er ETAGE Casablanca",
    "Affiliation CNSS : 7654321",
    "Representee par M. Karim Alami SEFRIOUI agissant en qualite de PDG",
    "D’une part,",
    "Mr : YOUSSEF AMRANI",
    "Demeurant a Hay Riad Rabat",
    "CIN : K1B23456",
    "D autre part.",
    "Il a ete convenu ce qui suit,",
    "Ce contrat prend effet a compter du 01/08/2023.",
    "Il ne deviendra definitif qu’a l’expiration d’une periode d’essai de 3 mois, comme a Fentreprise.",
    "Mr YOUSSEF AMRANI en sa qualite de « Developpeur Full stack ».",
    "Le salaire mensuel net sera de 4 000,00 dirhams et sera paye par virement bancaire et le salaire brut 4 332,00 dirhams.",
    "La duree de non-concurrence est relative a une duree de 24 mois apres la derniere intervention.",
    "Fait en double exemplaire a Casablanca, le",
]


def html(lines):
    return "<div>" + "".join(f"<p>{ln}</p>" for ln in lines) + "</div>"


def keys(fields):
    return {f["key"] for f in fields}


def plain(body):
    return tf._text_runs(tf.strip_meta(body))[2]


def test_a_cdd_keeps_the_company_and_finds_every_employee_detail():
    body, fields = tf.build_template(html(CDD))
    assert {"full_name", "civility", "cin", "address", "position", "duration", "contract_start", "contract_end", "trial_period",
            "work_mode", "salary_figures", "salary_words", "company_city", "today"} <= keys(fields)
    text = plain(body)
    # the company's side does not move: its name, head office, the manager who signs for it, the kind of contract
    assert "représentée par M.KARIM ALAMI SEFRIOUI, GERANT" in text and "12 RUE EXEMPLE CASABLANCA" in text
    assert text.count("KARIM ALAMI SEFRIOUI") == 2 and "BENNANI" not in text and "Sara" not in text
    assert text.strip().startswith("CONTRAT DE TRAVAIL À DURÉE DÉTERMINÉE (CDD)") and "dénommée « l'Employeur »" in text and "propriété exclusive de ACME SARL" in text
    # the employee's details are fields, everywhere they are written
    assert "{{civility}} {{full_name}}, titulaire de la CIN n° {{cin}}, demeurant à {{address}}, ci-après dénommé(e)" in text
    assert text.count("{{position}}") == 2 and "durée déterminée de {{duration}}, prenant effet le {{contract_start}}" in text
    assert "échéance le {{contract_end}}" in text and "période d'essai de {{trial_period}}" in text
    assert "mode de travail {{work_mode}}, alternant" in text and "{{salary_figures}} MAD ({{salary_words}} dirhams)" in text
    assert "Fait à {{company_city}}, le {{today}}" in text and "Il a été convenu" in text
    trial = next(f for f in fields if f["key"] == "trial_period")
    assert trial["label"] == "Période d'essai" and trial["default"] == "15 jours"
    assert next(f for f in fields if f["key"] == "work_mode")["default"] == "Hybride (présentiel et télétravail)"


def test_a_scanned_cdi_net_and_gross_pay_and_the_missing_date():
    body, fields = tf.build_template(html(CDI_SCAN))
    assert {"full_name", "civility_short", "address", "cin", "contract_start", "trial_period", "position", "salary_net",
            "salary_figures", "today"} <= keys(fields)
    assert "cnss_number" not in keys(fields) and "duration" not in keys(fields)
    text = plain(body)
    assert "Affiliation CNSS : 7654321" in text and "Representee par M. Karim Alami SEFRIOUI agissant en qualite de PDG" in text
    assert "{{civility_short}} : {{full_name}}" in text and "Demeurant a {{address}}" in text and "CIN : {{cin}}" in text
    assert "a compter du {{contract_start}}" in text and "periode d’essai de {{trial_period}}" in text
    assert "en sa qualite de « {{position}} »" in text
    assert "net sera de {{salary_net}} dirhams" in text and "salaire brut {{salary_figures}} dirhams" in text
    assert "une duree de 24 mois" in text                      # a fixed clause, not the contract's duration
    assert "Fait en double exemplaire a Casablanca, le {{today}}" in text
    assert next(f for f in fields if f["key"] == "salary_net")["label"] == "Salaire net"


def test_the_generated_contract_reads_right():
    body, fields = tf.build_template(html(CDD))
    emp = {"full_name": "Nadia Tazi", "cin": "AB123456", "address": "Casablanca", "position": "Data analyst", "status": "active",
           "contract_start": "2026-12-01", "contract_end": "2027-05-31", "salary": 5000, "custom_fields": {"civility": "Madame"}}
    meta = tf.read_meta(body)
    ctx = build_context(emp, {}, {"name": "ACME SARL", "city": "Casablanca"}, meta)
    out = plain(tf.agree(render_template(tf.strip_meta(body), ctx), ctx.get("civility", "")))   # as /documents/generate
    assert "Madame Nadia Tazi, titulaire de la CIN n° AB123456" in out and "représentée par M.KARIM ALAMI SEFRIOUI" in out
    assert "ci-après dénommée « le Salarié »" in out and "dénommée « l'Employeur »" in out
    assert "recrutée en qualité de Data analyst" in out and out.rstrip().endswith("Madame\n\nNadia Tazi") and "durée déterminée de 6 mois" in out and "période d'essai de 15 jours" in out
    assert "5 000 MAD (cinq mille dirhams)" in out and "mode de travail Hybride (présentiel et télétravail)" in out


def _pdf(builder):
    import fitz
    doc = fitz.open()
    page = doc.new_page()
    builder(fitz, page)
    return doc.tobytes()


def test_a_watermark_is_not_part_of_the_document():
    def build(fitz, page):
        y = 70
        for line in CDD[:12]:
            page.insert_textbox(fitz.Rect(60, y, 540, y + 60), line, fontsize=10, fontname="helv")
            y += 52
        page.insert_text((150, 500), "SPECIMEN", fontsize=60, fontname="helv", color=(0.8, 0.8, 0.8),
                         morph=(fitz.Point(150, 500), fitz.Matrix(-30)))
    out = extract_template_smart(_pdf(build), "c.pdf")
    assert "SPECIMEN" not in out and "représentée par" in out and SCAN_MARK not in out


def test_a_scan_loses_its_stamp_and_its_ocr_slips():
    def build(fitz, page):
        pix = fitz.Pixmap(fitz.csRGB, fitz.IRect(0, 0, 60, 80), False)
        pix.clear_with(250)
        page.insert_image(page.rect, pixmap=pix)                      # the page picture
        y = 60
        lines = CDI_SCAN[:-1] + ["Fait en double exemplaire a Casablanca, le..£<^'.1 .....C?.X ■■■", "Signature du salarie",
                                 "■Z.", "$ign£: Toto TITI", "4>&iTMDl", "1’expiration et I’embauche, proIongee"]
        for line in lines:
            page.insert_text((50, y), line, fontsize=9, fontname="helv", render_mode=3)   # invisible OCR text
            y += 24
    out = extract_template_smart(_pdf(build), "scan.pdf")
    text = tf._text_runs(out.replace(SCAN_MARK, ""))[2]
    assert out.startswith(SCAN_MARK)
    assert "Fait en double exemplaire a Casablanca, le" in text and "£" not in text and "■" not in text
    assert "comme a l’entreprise" in text and "TITI" not in text and "iTMDl" not in text


def test_the_import_preview_says_it_is_a_scan():
    def build(fitz, page):
        pix = fitz.Pixmap(fitz.csRGB, fitz.IRect(0, 0, 60, 80), False)
        pix.clear_with(250)
        page.insert_image(page.rect, pixmap=pix)
        for k, line in enumerate(CDI_SCAN):
            page.insert_text((50, 60 + 24 * k), line, fontsize=9, fontname="helv", render_mode=3)
    db = FakeDB()
    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[get_current_user] = lambda: USER
    app.dependency_overrides[require_hr_or_admin] = lambda: USER
    c = TestClient(app)
    r = c.post("/api/templates/preview-import", files={"file": ("cdi.pdf", _pdf(build), "application/pdf")}, data={"mapping": ""})
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["scanned"] is True and SCAN_MARK not in d["body_template"]
    assert {"full_name", "salary_net", "salary_figures", "trial_period"} <= keys(d["fields"]) and "cnss_number" not in keys(d["fields"])


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
