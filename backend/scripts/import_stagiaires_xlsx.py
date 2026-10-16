"""
Import the intern register "ETAT DES STAGIAIRES TYTHON.xlsx" into the platform (employees with status='intern').

  python scripts/import_stagiaires_xlsx.py "<file.xlsx>"                # dry run: prints what would be added
  python scripts/import_stagiaires_xlsx.py "<file.xlsx>" --apply        # writes to the database
  python scripts/import_stagiaires_xlsx.py "<file.xlsx>" --fill-types  # sets "Type de stage" on interns already imported
  python scripts/import_stagiaires_xlsx.py --undo import_ids.json       # removes what a previous --apply added

Sheets read
  - "ETAT DES STAGIAIRES": Nom et prenom | Etude | Email | Mission | Date de debut | Date de fin |
                           Période de stage | Statut stage | Observation
  - "Liste PFA et PFE"   : NOM PRENOM | N° Téléphone | Contact De Responsable | Ecole | Date De Départ |
                           Date De Fin | DECISION | Département affecté | Statut
The same person found in both sheets is merged into one record. Existing interns are never duplicated
(matched on e-mail, or on the normalized name + start date). The "ETAT TESTS" sheet (candidates) is ignored.
"""
import json
import os
import re
import sys
import unicodedata
from collections import Counter
from datetime import date, datetime, timedelta

import openpyxl
from dotenv import load_dotenv
from supabase import ClientOptions, create_client

load_dotenv()

MAIN_SHEET = "ETAT DES STAGIAIRES"
PFE_SHEET = "Liste PFA et PFE"

STATUS_MAP = {
    "quitte": "Quitté", "termine": "Terminé", "embauche": "Embauché", "desistement": "Désistement",
    "deperdition": "Déperdition", "en cours": "En cours", "arrete": "Arrêté", "arrete ": "Arrêté",
    "fin de stage": "Fin de stage", "demissione": "Démissionné", "demissionne": "Démissionné",
    "valide": "Validé", "non valide": "Non validé", "annulee": "Annulée", "explusion": "Expulsion", "expulsion": "Expulsion",
}
# The workbook has no "type" column. Two explicit hints only:
#   - the sheet "Liste PFA et PFE" is titled "Liste des stagiaires PFE"
#   - some end-date cells of the main sheet end with the word "PFE"
TYPE_PFE = "Stage PFE (Projet de Fin d’Études)"
DATE_RE = re.compile(r"(\d{1,2})\s*[/\-.]\s*(\d{1,2})\s*[/\-.]\s*(\d{2,4})")
CLEAN_DATE_RE = re.compile(r"^\s*(le\s+)?\d{1,2}\s*[/\-.]\s*\d{1,2}\s*[/\-.]\s*\d{2,4}\s*$", re.I)


def strip_accents(s: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")


def clean(v) -> str | None:
    if v is None:
        return None
    s = re.sub(r"\s+", " ", str(v)).strip(" \t\r\n-–")
    return s or None


def name_key(name: str) -> str:
    """Order-insensitive key: 'Hani Salma' == 'SALMA hani'."""
    toks = re.sub(r"[^a-z ]", " ", strip_accents(name).lower()).split()
    return " ".join(sorted(toks))


def norm_status(v) -> str | None:
    s = clean(v)
    if not s:
        return None
    k = strip_accents(s).lower().strip()
    return STATUS_MAP.get(k) or s[:1].upper() + s[1:].lower()


def norm_period(v) -> str | None:
    s = clean(v)
    if not s:
        return None
    return s.lower()


def to_date(y: int, m: int, d: int) -> date | None:
    if y < 100:
        y += 2000
    try:
        out = date(y, m, d)
    except ValueError:
        return None
    return out if 2018 <= out.year <= 2032 else None


def parse_dates(v) -> tuple[list[date], bool]:
    """All dates found in a cell + whether the cell was a clean single date (nothing else written in it)."""
    if v is None or (isinstance(v, str) and not v.strip()):
        return [], True
    if isinstance(v, datetime):
        return [v.date()], True
    if isinstance(v, date):
        return [v], True
    if isinstance(v, (int, float)) and 20000 < float(v) < 80000:      # Excel serial number
        return [(datetime(1899, 12, 30) + timedelta(days=float(v))).date()], True
    s = str(v)
    found = [d for m in DATE_RE.finditer(s) if (d := to_date(int(m.group(3)), int(m.group(2)), int(m.group(1))))]
    return found, bool(CLEAN_DATE_RE.match(s)) and len(found) == 1


def read_main(wb) -> list[dict]:
    ws = wb[MAIN_SHEET]
    out = []
    for r in ws.iter_rows(min_row=4, values_only=True):
        name = clean(r[1])
        if not name:
            continue
        sd, sd_clean = parse_dates(r[5])
        ed, ed_clean = parse_dates(r[6])
        notes = []
        if clean(r[9]):
            notes.append(clean(r[9]))
        if not sd_clean and r[5] not in (None, ""):
            notes.append(f"Date de début (fichier) : {clean(r[5])}")
        if not ed_clean and r[6] not in (None, ""):
            notes.append(f"Date de fin (fichier) : {clean(r[6])}")
        email = (clean(r[3]) or "").lower() or None
        if email and not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
            notes.append(f"Email (fichier) : {email}")
            email = None
        out.append({
            "full_name": name, "education_summary": clean(r[2]), "email": email, "position": clean(r[4]),
            "internship_start": sd[0].isoformat() if sd else None,
            "internship_end": ed[-1].isoformat() if ed else None,       # messy end cells: the last date is the end
            "internship_period": norm_period(r[7]), "internship_status": norm_status(r[8]),
            "internship_type": TYPE_PFE if re.search(r"pfe", str(r[6] or ""), re.I) else None,
            "notes": " | ".join(notes) or None, "_src": "etat",
        })
    return out


def read_pfe(wb) -> list[dict]:
    ws = wb[PFE_SHEET]
    out = []
    for r in ws.iter_rows(min_row=8, values_only=True):
        name = clean(r[1])
        if not name:
            continue
        sd, _ = parse_dates(r[5])
        ed, _ = parse_dates(r[6])
        decision = clean(r[7])
        period = decision if decision and re.search(r"\d+\s*mois", decision, re.I) else None
        notes = [f"Décision : {decision}"] if decision and not period else []
        out.append({
            "full_name": name, "phone": clean(r[2]), "school_contact": clean(r[3]), "school": clean(r[4]),
            "internship_start": sd[0].isoformat() if sd else None,
            "internship_end": ed[-1].isoformat() if ed else None,
            "internship_period": norm_period(period), "position": clean(r[8]), "department": clean(r[8]),
            "internship_status": norm_status(r[9]), "internship_type": TYPE_PFE,
            "notes": " | ".join(notes) or None, "_src": "pfe",
        })
    return out


def merge(main: list[dict], pfe: list[dict]) -> list[dict]:
    """One record per person: sheet 1 wins, sheet 2 fills what sheet 1 does not have."""
    by_key = {name_key(r["full_name"]): r for r in main}
    merged = list(main)
    for p in pfe:
        k = name_key(p["full_name"])
        if k in by_key:
            base = by_key[k]
            for f, v in p.items():
                if f != "_src" and v and not base.get(f):
                    base[f] = v
            base["_src"] = "etat+pfe"
        else:
            by_key[k] = p
            merged.append(p)
    return merged


def connect():
    return create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"],
                         options=ClientOptions(schema=os.getenv("SUPABASE_SCHEMA", "public")))


def main() -> None:
    args = sys.argv[1:]
    if args[:1] == ["--undo"]:
        ids = json.load(open(args[1], encoding="utf-8"))
        sb = connect()
        for i in range(0, len(ids), 50):
            sb.table("employees").delete().in_("id", ids[i:i + 50]).eq("status", "intern").execute()
        print(f"Removed {len(ids)} imported interns.")
        return

    path = next(a for a in args if not a.startswith("--"))
    apply = "--apply" in args
    wb = openpyxl.load_workbook(path, data_only=True)
    main_rows, pfe_rows = read_main(wb), read_pfe(wb)
    rows = merge(main_rows, pfe_rows)

    sb = connect()
    if "--fill-types" in args:
        db = sb.table("employees").select("id,full_name,internship_start,internship_type").eq("status", "intern").range(0, 9999).execute().data or []
        index = {(name_key(d["full_name"]), d.get("internship_start")): d for d in db}
        todo_types = []
        for r in rows:
            d = index.get((name_key(r["full_name"]), r.get("internship_start")))
            if d and r.get("internship_type") and not d.get("internship_type"):
                todo_types.append(d["id"])
        print(f"Interns that get a type from the file: {len(todo_types)} (already typed or no hint: left untouched)")
        if apply:
            for i in range(0, len(todo_types), 50):
                sb.table("employees").update({"internship_type": TYPE_PFE}).in_("id", todo_types[i:i + 50]).execute()
            print("Done.")
        else:
            print("Dry run only. Re-run with --apply to write.")
        return
    existing = sb.table("employees").select("id,full_name,email,internship_start,status").eq("status", "intern").range(0, 9999).execute().data or []
    have_email = {e["email"].lower() for e in existing if e.get("email")}
    have_name_start = {(name_key(e["full_name"]), e.get("internship_start")) for e in existing}
    employees = sb.table("employees").select("full_name,email,status").neq("status", "intern").range(0, 9999).execute().data or []
    emp_keys = {name_key(e["full_name"]) for e in employees} | {e["email"].lower() for e in employees if e.get("email")}

    # "Département affecté": reuse the exact name of an existing department when it is the same one written differently
    dept_names = [d["name"] for d in sb.table("departments").select("name").execute().data or []]
    canon = {re.sub(r"[^a-z0-9]", "", strip_accents(n).lower()): n for n in dept_names}
    for r in rows:
        if r.get("department"):
            r["department"] = canon.get(re.sub(r"[^a-z0-9]", "", strip_accents(r["department"]).lower()), r["department"])

    todo, skipped = [], []
    for r in rows:
        if (r.get("email") and r["email"] in have_email) or (name_key(r["full_name"]), r.get("internship_start")) in have_name_start:
            skipped.append(r["full_name"])
        else:
            todo.append(r)

    print(f"Sheet '{MAIN_SHEET}': {len(main_rows)} rows | Sheet '{PFE_SHEET}': {len(pfe_rows)} rows "
          f"| merged people: {len(rows)} (duplicates between sheets: {len(main_rows) + len(pfe_rows) - len(rows)})")
    print(f"Already in the database (skipped): {len(skipped)} | To add: {len(todo)}")
    print("Statut stage :", dict(Counter(r.get('internship_status') for r in todo).most_common()))
    print("Missing dates:", sum(1 for r in todo if not r.get('internship_start')), "start /", sum(1 for r in todo if not r.get('internship_end')), "end")
    print("Also an employee today (same name/e-mail):", sum(1 for r in todo if name_key(r['full_name']) in emp_keys or (r.get('email') in emp_keys)))
    print("Example:", {k: v for k, v in todo[0].items() if v} if todo else None)

    if not apply:
        print("\nDry run only. Re-run with --apply to write to the database.")
        return

    ids = []
    for i in range(0, len(todo), 50):
        batch = [{**{k: v for k, v in r.items() if not k.startswith("_") and v is not None}, "status": "intern"} for r in todo[i:i + 50]]
        res = sb.table("employees").insert(batch).execute()
        ids += [x["id"] for x in res.data or []]
    out = os.path.join(os.path.dirname(os.path.abspath(path)), "import_ids.json")
    json.dump(ids, open(out, "w", encoding="utf-8"))
    print(f"Added {len(ids)} interns. Ids saved in {out} (undo: --undo \"{out}\").")


if __name__ == "__main__":
    main()
