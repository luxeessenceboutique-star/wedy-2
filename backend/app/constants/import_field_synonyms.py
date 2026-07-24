"""
Header synonyms for the employee/intern spreadsheet import feature.

Each key is a real column on the `employees` table (see EmployeeCreate in
app/schemas/profile.py). Values are the raw header spellings a source
spreadsheet might use, in French, English, and Arabic. Matching is done
against normalized (accent-stripped, lowercased, whitespace-collapsed)
versions of both the header and these synonyms — see
app/services/import_service.py:normalize_header.

Concepts requested by users that have no dedicated column today (gender,
internship type, education level, ...) are intentionally NOT listed here —
unmatched headers fall through to `custom_fields` instead of being forced
onto an unrelated column.
"""

FIELD_SYNONYMS: dict[str, list[str]] = {
    "full_name": [
        "nom", "nom complet", "nom et prenom", "nom et prénom", "prenom et nom",
        "full name", "name", "employee name", "fullname",
        "الاسم", "الاسم الكامل", "اسم الموظف", "الاسم و اللقب",
    ],
    "cin": [
        "cin", "carte d'identite", "carte d'identité", "numero cin", "n cin",
        "id number", "national id", "identity card", "identity number",
        "رقم البطاقة الوطنية", "البطاقة الوطنية", "رقم بطاقة التعريف",
    ],
    "matricule": [
        "matricule", "employee id", "id employe", "id employé", "numero matricule",
        "employee number", "staff id", "registration number",
        "الرقم التسلسلي", "رقم الموظف",
    ],
    "email": [
        "email", "e-mail", "mail", "adresse email", "adresse e-mail", "courriel",
        "البريد الإلكتروني", "الإيميل", "البريد الالكتروني",
    ],
    "phone": [
        "telephone", "téléphone", "phone", "phone number", "mobile", "tel", "gsm",
        "numero telephone", "numero de telephone", "contact",
        "الهاتف", "رقم الهاتف", "الجوال", "الهاتف المحمول",
    ],
    "position": [
        "poste", "poste occupe", "poste occupé", "job title", "position",
        "fonction", "job", "titre", "titre du poste",
        "المنصب", "الوظيفة",
    ],
    "department": [
        "departement", "département", "department", "service", "dept",
        "القسم", "الإدارة", "المصلحة",
    ],
    "status": [
        "statut", "status", "etat", "état",
        "الحالة",
    ],
    "hire_date": [
        "date embauche", "date d'embauche", "hire date", "date recrutement",
        "date de recrutement", "embauche", "date d'entree", "date d'entrée",
        "تاريخ التوظيف", "تاريخ التعيين",
    ],
    "contract_type": [
        "type contrat", "type de contrat", "contract type", "nature contrat",
        "nature du contrat",
        "نوع العقد",
    ],
    "contract_start": [
        "date debut contrat", "date de debut contrat", "date de début contrat",
        "contract start", "contract start date", "debut contrat", "début contrat",
        "تاريخ بداية العقد",
    ],
    "contract_end": [
        "date fin contrat", "date de fin contrat", "contract end",
        "contract end date", "fin contrat",
        "تاريخ نهاية العقد",
    ],
    "salary": [
        "salaire", "salary", "remuneration", "rémunération", "wage", "pay",
        "salaire mensuel", "monthly salary",
        "الراتب", "الأجر", "الراتب الشهري",
    ],
    "birth_date": [
        "date naissance", "date de naissance", "birth date", "date of birth",
        "ne le", "né le", "dob",
        "تاريخ الميلاد",
    ],
    "address": [
        "adresse", "address", "adresse domicile", "home address",
        "العنوان",
    ],
    "city": [
        "ville", "city", "town",
        "المدينة",
    ],
    "nationality": [
        "nationalite", "nationalité", "nationality",
        "الجنسية",
    ],
    "manager": [
        "manager", "responsable", "superviseur", "supervisor", "chef",
        "n+1", "reporting manager",
        "المدير", "المسؤول", "المشرف",
    ],
    "cnss_number": [
        "cnss", "numero cnss", "numéro cnss", "n cnss", "cnss number",
        "رقم الضمان الاجتماعي",
    ],
    "bank_account": [
        "rib", "compte bancaire", "bank account", "iban",
        "الحساب البنكي",
    ],
    "notes": [
        "notes", "remarques", "remarks", "comments", "commentaires", "observation",
        "ملاحظات",
    ],
    "internship_start": [
        "date debut stage", "date de debut stage", "date de début stage",
        "internship start", "internship start date", "debut stage", "début stage",
        "تاريخ بداية التدريب",
    ],
    "internship_end": [
        "date fin stage", "date de fin stage", "internship end",
        "internship end date", "fin stage",
        "تاريخ نهاية التدريب",
    ],
    "school": [
        "ecole", "école", "school", "university", "universite", "université",
        "institut", "etablissement", "établissement",
        "المدرسة", "الجامعة", "المعهد",
    ],
}

# Fields the import pipeline will actually write to a real column.
KNOWN_IMPORT_FIELDS: list[str] = list(FIELD_SYNONYMS.keys())
