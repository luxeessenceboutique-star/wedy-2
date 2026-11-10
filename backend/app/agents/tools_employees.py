"""Employees & interns agent: people, contracts, departments."""
from datetime import date, timedelta
from typing import Optional

from app.agents.runtime import (
    PEOPLE, STAFF, ToolError, brief, ctx, hr_tool, link, norm, one_person, parse_date, roster, run_handler, tr,
)
from app.routers import employees as emp_router
from app.routers import interns as intern_router
from app.schemas.profile import EmployeeCreate, EmployeeUpdate

A = "employees"
FIELDS = ("id", "full_name", "cin", "email", "phone", "position", "department", "status", "hire_date", "contract_type", "contract_start",
          "contract_end", "salary", "manager", "city", "address", "birth_date", "nationality", "matricule", "notes", "internship_start",
          "internship_end", "school", "internship_status")


def _days_left(d: Optional[str]) -> Optional[int]:
    try:
        return (date.fromisoformat(str(d)[:10]) - date.today()).days if d else None
    except ValueError:
        return None


@hr_tool(A, ("Rechercher des employés", "Search employees", "البحث عن موظفين"))
def search_employees(query: str = "", status: str = "", department: str = "", limit: int = 25) -> dict:
    """Search the staff (employees and interns, never candidates) by name, e-mail, position, department or status.
    Use it to list people, count them or find someone. Returns brief records.

    Args:
      query: Part of a name, e-mail or position (accents ignored). Empty = everyone matching the other filters.
      status: active, on-leave, inactive, terminated or intern. Empty = all.
      department: Exact or partial department name.
      limit: Maximum records returned (default 25).
    """
    q, dep = norm(query), norm(department)
    rows = [r for r in roster(PEOPLE)
            if (not status or r.get("status") == status)
            and (not dep or dep in norm(r.get("department")))
            and (not q or q in norm(r.get("full_name")) or q in norm(r.get("email")) or q in norm(r.get("position")))]
    return {"total": len(rows), "shown": min(len(rows), limit),
            "people": [{**brief(r), "email": r.get("email"), "contract_type": r.get("contract_type"), "contract_end": r.get("contract_end"), "hire_date": r.get("hire_date")} for r in rows[:limit]]}


@hr_tool(A, ("Consulter un dossier", "Open an employee file", "عرض ملف موظف"))
def get_employee(employee: str) -> dict:
    """Full file of one person (identity, contract, salary, manager…). Give a name, an e-mail or an id.

    Args:
      employee: Name, e-mail or id of the employee or intern.
    """
    r = one_person(employee, PEOPLE)
    full = run_handler(emp_router.get_employee, r["id"], ctx().db, ctx().user)
    out = {k: full.get(k) for k in FIELDS if full.get(k) not in (None, "")}
    out["contract_days_left"] = _days_left(full.get("contract_end"))
    out["links"] = [link(f"/app/employees/{r['id']}", tr("Ouvrir le dossier", "Open the file", "فتح الملف"))]
    return out


def _create_preview(a: dict) -> dict:
    d = [[tr("Nom", "Name", "الاسم"), a["full_name"]]]
    for k, lab in (("position", ("Poste", "Position", "المنصب")), ("department", ("Service", "Department", "المصلحة")), ("contract_type", ("Contrat", "Contract", "العقد")),
                   ("hire_date", ("Embauche", "Hire date", "تاريخ التوظيف")), ("salary", ("Salaire (MAD)", "Salary (MAD)", "الأجر (درهم)")), ("email", ("Email", "Email", "البريد")),
                   ("cin", ("CIN", "ID", "البطاقة")), ("phone", ("Téléphone", "Phone", "الهاتف"))):
        if a.get(k) not in (None, ""):
            d.append([tr(*lab), a[k]])
    return {"summary": tr(f"Créer le dossier de {a['full_name']}", f"Create the file of {a['full_name']}", f"إنشاء ملف {a['full_name']}"), "details": d}


@hr_tool(A, ("Créer un employé", "Create an employee", "إنشاء موظف"), write=True, preview=_create_preview)
def create_employee(full_name: str, cin: str = "", email: str = "", phone: str = "", position: str = "", department: str = "",
                    contract_type: str = "", hire_date: str = "", contract_end: str = "", salary: float = 0, manager: str = "", city: str = "") -> dict:
    """Create a new employee file (status active).

    Args:
      full_name: Full name (required).
      cin: National ID number.
      email: Work or personal e-mail.
      phone: Phone number.
      position: Job title.
      department: Department name (use list_departments for the existing ones).
      contract_type: CDI, CDD, Stage, Freelance…
      hire_date: Hire date, YYYY-MM-DD (default today).
      contract_end: Contract end date for a CDD, YYYY-MM-DD.
      salary: Gross monthly salary in MAD.
      manager: Name of the manager.
      city: City.
    """
    data = {"full_name": full_name.strip(), "cin": cin or None, "email": email or None, "phone": phone or None, "position": position or None,
            "department": department or None, "contract_type": contract_type or None, "manager": manager or None, "city": city or None,
            "hire_date": parse_date(hire_date, "hire_date") if hire_date else date.today(), "status": "active"}
    if contract_end:
        data["contract_end"] = parse_date(contract_end, "contract_end")
    if salary:
        data["salary"] = float(salary)
    created = run_handler(emp_router.create_employee, EmployeeCreate(**{k: v for k, v in data.items() if v is not None}), ctx().db, ctx().user)
    ctx().cache.pop("roster", None)
    return {"created": True, "id": created.get("id"), "name": created.get("full_name"), "links": [link(f"/app/employees/{created.get('id')}", tr("Ouvrir le dossier", "Open the file", "فتح الملف"))]}


_UPDATABLE = ("position", "department", "status", "email", "phone", "salary", "contract_type", "contract_end", "manager", "city", "address", "notes")


def _update_preview(a: dict) -> dict:
    r = one_person(a["employee"], PEOPLE)
    d = [[k, f"{r.get(k) if k in r else '…'} → {a[k]}"] for k in _UPDATABLE if a.get(k) not in (None, "")]
    if not d:
        raise ToolError(tr("Aucune modification indiquée.", "No change given.", "لم يتم تحديد أي تعديل."))
    return {"summary": tr(f"Modifier le dossier de {r['full_name']}", f"Update {r['full_name']}'s file", f"تعديل ملف {r['full_name']}"), "details": d}


@hr_tool(A, ("Modifier un dossier", "Update a file", "تعديل ملف"), write=True, preview=_update_preview)
def update_employee(employee: str, position: str = "", department: str = "", status: str = "", email: str = "", phone: str = "", salary: float = 0,
                    contract_type: str = "", contract_end: str = "", manager: str = "", city: str = "", address: str = "", notes: str = "") -> dict:
    """Change fields of an employee file. Only the given fields change.

    Args:
      employee: Name, e-mail or id of the person.
      position: New job title.
      department: New department.
      status: active, on-leave, inactive or terminated.
      email: New e-mail.
      phone: New phone.
      salary: New gross monthly salary in MAD.
      contract_type: New contract type (CDI, CDD…).
      contract_end: New contract end date, YYYY-MM-DD.
      manager: New manager name.
      city: New city.
      address: New address.
      notes: New notes.
    """
    r = one_person(employee, PEOPLE)
    changes = {k: v for k, v in dict(position=position, department=department, status=status, email=email, phone=phone, contract_type=contract_type,
                                     manager=manager, city=city, address=address, notes=notes).items() if v}
    if salary:
        changes["salary"] = float(salary)
    if contract_end:
        changes["contract_end"] = parse_date(contract_end, "contract_end")
    if not changes:
        raise ToolError(tr("Aucune modification indiquée.", "No change given.", "لم يتم تحديد أي تعديل."))
    run_handler(emp_router.update_employee, r["id"], EmployeeUpdate(**changes), ctx().db, ctx().user)
    ctx().cache.pop("roster", None)
    return {"updated": True, "name": r["full_name"], "changed": list(changes), "links": [link(f"/app/employees/{r['id']}", tr("Ouvrir le dossier", "Open the file", "فتح الملف"))]}


def _delete_preview(a: dict) -> dict:
    r = one_person(a["employee"], PEOPLE)
    return {"summary": tr(f"Supprimer définitivement le dossier de {r['full_name']}", f"Permanently delete {r['full_name']}'s file", f"حذف ملف {r['full_name']} نهائيًا"),
            "details": [[tr("Poste", "Position", "المنصب"), r.get("position") or "—"], [tr("Statut", "Status", "الحالة"), r.get("status")]]}


@hr_tool(A, ("Supprimer un dossier", "Delete a file", "حذف ملف"), write=True, danger=True, preview=_delete_preview)
def delete_employee(employee: str) -> dict:
    """Permanently delete an employee file. Irreversible: use only when the user clearly asks to delete (not to deactivate).

    Args:
      employee: Name, e-mail or id of the person.
    """
    r = one_person(employee, PEOPLE)
    run_handler(emp_router.delete_employee, r["id"], ctx().db, ctx().user)
    ctx().cache.pop("roster", None)
    return {"deleted": True, "name": r["full_name"]}


@hr_tool(A, ("Contrats à échéance", "Contracts ending soon", "العقود المنتهية قريبًا"))
def contracts_expiring(days: int = 30, include_expired: bool = False) -> dict:
    """Staff whose contract ends within the next N days (and optionally already expired ones).

    Args:
      days: Look-ahead window in days (default 30).
      include_expired: Also list contracts that already ended.
    """
    out = []
    for r in roster(STAFF):
        n = _days_left(r.get("contract_end"))
        if n is None or r.get("status") == "terminated":
            continue
        if 0 <= n <= days or (include_expired and n < 0):
            out.append({**brief(r), "contract_type": r.get("contract_type"), "contract_end": r.get("contract_end"), "days_left": n})
    out.sort(key=lambda x: x["days_left"])
    return {"count": len(out), "contracts": out[:40], "links": [link("/app/employees?status=expiring", tr("Voir dans Employés", "See in Employees", "عرض في الموظفين"))]}


@hr_tool(A, ("Liste des départements", "List departments", "لائحة المصالح"))
def list_departments() -> dict:
    """Departments with their headcount."""
    from collections import Counter
    c = Counter((r.get("department") or "—") for r in roster({"active", "on-leave"}))
    names = [d.get("name") for d in (ctx().db.table("departments").select("name").execute().data or [])]
    return {"departments": [{"name": n, "headcount": c.get(n, 0)} for n in sorted(set(names) | set(c) - {"—"})], "without_department": c.get("—", 0)}


@hr_tool(A, ("Liste des stagiaires", "List interns", "لائحة المتدربين"))
def list_interns(status: str = "", ending_in_days: int = 0) -> dict:
    """Interns with their school, tutor, dates and internship status.

    Args:
      status: Register status (« En cours », « Embauché », « Terminé »…). Empty = all.
      ending_in_days: Only interns whose internship ends within N days (0 = no filter).
    """
    rows = [r for r in roster({"intern"}) if (not status or norm(r.get("internship_status")) == norm(status))]
    out = []
    for r in rows:
        n = _days_left(r.get("internship_end"))
        if ending_in_days and (n is None or not 0 <= n <= ending_in_days):
            continue
        out.append({**brief(r), "school": r.get("school"), "internship_status": r.get("internship_status"), "manager": r.get("manager"), "days_left": n})
    return {"count": len(out), "interns": out[:40], "links": [link("/app/interns", tr("Ouvrir Stagiaires", "Open Interns", "فتح المتدربين"))]}


def _intern_preview(a: dict) -> dict:
    r = one_person(a["intern"], {"intern"})
    return {"summary": tr(f"Embaucher {r['full_name']} en CDI", f"Hire {r['full_name']} on a permanent contract", f"توظيف {r['full_name']} بعقد دائم"),
            "details": [[tr("Stage", "Internship", "التدريب"), r.get("position") or "—"], [tr("Contrat", "Contract", "العقد"), a.get("contract_type") or "CDI"]]}


@hr_tool(A, ("Embaucher un stagiaire", "Hire an intern", "توظيف متدرب"), write=True, preview=_intern_preview)
def convert_intern(intern: str, contract_type: str = "CDI") -> dict:
    """Hire an intern: becomes an active employee with a hire date today and the register status « Embauché ».

    Args:
      intern: Name of the intern.
      contract_type: Contract of the new employee (default CDI).
    """
    r = one_person(intern, {"intern"})
    run_handler(intern_router.convert_intern_to_employee, r["id"], {"contract_type": contract_type or "CDI"}, ctx().db, ctx().user)
    ctx().cache.pop("roster", None)
    return {"hired": True, "name": r["full_name"], "links": [link(f"/app/employees/{r['id']}", tr("Ouvrir le dossier", "Open the file", "فتح الملف"))]}


def _create_intern_preview(a: dict) -> dict:
    d = [[tr("Nom", "Name", "الاسم"), a["full_name"]]]
    for k, lab in (("school", ("École", "School", "المدرسة")), ("position", ("Mission", "Mission", "المهمة")), ("department", ("Service", "Department", "المصلحة")),
                   ("internship_start", ("Début", "Start", "البداية")), ("internship_end", ("Fin", "End", "النهاية")), ("manager", ("Encadrant", "Tutor", "المؤطر"))):
        if a.get(k):
            d.append([tr(*lab), a[k]])
    return {"summary": tr(f"Ajouter le stagiaire {a['full_name']}", f"Add intern {a['full_name']}", f"إضافة المتدرب {a['full_name']}"), "details": d}


@hr_tool(A, ("Ajouter un stagiaire", "Add an intern", "إضافة متدرب"), write=True, preview=_create_intern_preview)
def create_intern(full_name: str, school: str = "", position: str = "", department: str = "", internship_start: str = "", internship_end: str = "",
                  manager: str = "", email: str = "", phone: str = "") -> dict:
    """Add an intern (status intern, contract Stage, register status « En cours »).

    Args:
      full_name: Full name (required).
      school: School or university.
      position: Mission of the internship.
      department: Department.
      internship_start: Start date, YYYY-MM-DD.
      internship_end: End date, YYYY-MM-DD.
      manager: Tutor / supervisor name.
      email: E-mail.
      phone: Phone.
    """
    payload = {"full_name": full_name.strip(), "school": school or None, "position": position or None, "department": department or None,
               "manager": manager or None, "email": email or None, "phone": phone or None, "internship_status": "En cours"}
    if internship_start:
        payload["internship_start"] = str(parse_date(internship_start, "internship_start"))
    if internship_end:
        payload["internship_end"] = str(parse_date(internship_end, "internship_end"))
    created = run_handler(intern_router.create_intern, {k: v for k, v in payload.items() if v is not None}, ctx().db, ctx().user)
    ctx().cache.pop("roster", None)
    return {"created": True, "id": created.get("id"), "links": [link(f"/app/interns?i={created.get('id')}", tr("Ouvrir le stagiaire", "Open the intern", "فتح المتدرب"))]}
