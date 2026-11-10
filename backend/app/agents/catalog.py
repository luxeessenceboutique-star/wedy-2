"""The agents: who they are, what the supervisor knows about them, and the examples shown to the user."""

# name → (label fr/en/ar, description for the supervisor, domain prompt, keywords for the fallback router, UI examples fr/en/ar)
AGENTS: dict[str, dict] = {
    "employees": {
        "label": ("Employés & stagiaires", "Employees & interns", "الموظفون والمتدربون"),
        "route": "People files: find / list / count employees and interns, open a file, create or update an employee, change status, delete a file, "
                 "contracts ending soon, departments, add an intern, hire an intern.",
        "prompt": "You manage the people files of the company: employees and interns (never candidates). Find people, read their files, create and update them, "
                  "follow contracts and departments, add interns and hire them.",
        "kw": ("employé", "employe", "employee", "staff", "effectif", "contrat", "contract", "salaire", "salary", "département", "department", "stagiaire", "intern", "dossier", "موظف", "عقد", "متدرب", "أجر"),
        "examples": [("Combien d'employés actifs par département ?", "How many active employees per department?", "كم عدد الموظفين النشطين في كل مصلحة؟"),
                     ("Quels contrats se terminent ce mois-ci ?", "Which contracts end this month?", "ما هي العقود التي تنتهي هذا الشهر؟")],
    },
    "leave": {
        "label": ("Congés & demandes", "Leave & requests", "العطل والطلبات"),
        "route": "Leave and absences: pending leave requests, balances, who is absent, public holidays, create a leave request, approve / reject leave, "
                 "the requests inbox (leave, document and other requests) and handling them.",
        "prompt": "You manage leave and employee requests: balances, absences, holidays, creating leave requests, approving or rejecting them, and the requests inbox.",
        "kw": ("congé", "conge", "leave", "absent", "absence", "vacances", "solde", "balance", "demande", "request", "férié", "holiday", "عطلة", "إجازة", "غياب", "طلب"),
        "examples": [("Qui est absent aujourd'hui ?", "Who is absent today?", "من هو غائب اليوم؟"),
                     ("Approuve les congés en attente de l'équipe Finance", "Approve the pending leave of the Finance team", "وافق على العطل المعلقة لفريق المالية")],
    },
    "recruitment": {
        "label": ("Recrutement", "Recruitment", "التوظيف"),
        "route": "Hiring: job posts (list, publish — the agent writes the ad —, close), applications grouped by post, candidate files, moving candidates "
                 "in the pipeline or rejecting them, interviews (list, schedule with a Wedy video meeting), hiring a candidate.",
        "prompt": "You run recruitment: job posts, applications by post, candidates' pipeline, interviews and hiring. When asked to publish a job post, you write "
                  "the whole ad yourself (hook, missions, profile, what we offer, call to apply; plain text with « • » bullets) in the requested language and "
                  "never invent a salary or a perk that the user did not give.",
        "kw": ("recrut", "candidat", "candidate", "annonce", "job post", "entretien", "interview", "offre d'emploi", "hiring", "embauch", "postul", "cv", "توظيف", "مترشح", "إعلان", "مقابلة"),
        "examples": [("Publie une annonce pour un développeur React à Casablanca", "Publish a job post for a React developer in Casablanca", "انشر إعلانًا لمطور React في الدار البيضاء"),
                     ("Planifie un entretien avec Zineb demain à 10h", "Schedule an interview with Zineb tomorrow at 10", "برمج مقابلة مع زينب غدًا على الساعة 10")],
    },
    "documents": {
        "label": ("Documents", "Documents", "الوثائق"),
        "route": "Official documents: list templates, generate an attestation / contract / certificate / letter for an employee from a template (FR/EN/AR), history of generated documents.",
        "prompt": "You produce official HR documents from the company templates for employees and interns, and look up the history of generated documents.",
        "kw": ("document", "attestation", "certificat", "certificate", "contrat de", "lettre", "letter", "modèle", "template", "bulletin", "وثيقة", "شهادة", "نموذج"),
        "examples": [("Génère une attestation de travail pour Karim", "Generate an employment certificate for Karim", "أنشئ شهادة عمل لكريم"),
                     ("Quels documents ont été générés cette semaine ?", "Which documents were generated this week?", "ما هي الوثائق التي أُنشئت هذا الأسبوع؟")],
    },
    "talent": {
        "label": ("Performance & formation", "Performance & training", "الأداء والتكوين"),
        "route": "Performance reviews (campaigns, status, reminders), training catalog and assignments, talent / OKR overview.",
        "prompt": "You handle performance reviews, training and talent: campaigns, reminders, enrolling people in trainings and reporting progress.",
        "kw": ("performance", "évaluation", "evaluation", "review", "entretien annuel", "campagne", "formation", "training", "talent", "okr", "compétence", "skill", "أداء", "تقييم", "تكوين"),
        "examples": [("Lance la campagne d'entretiens annuels 2026", "Start the 2026 annual review campaign", "أطلق حملة التقييم السنوي 2026"),
                     ("Inscris Sara à la formation Excel", "Enrol Sara in the Excel training", "سجّل سارة في تكوين Excel")],
    },
    "analytics": {
        "label": ("Analytics & paie", "Analytics & payroll", "التحليلات والرواتب"),
        "route": "Numbers and reports: HR KPIs, headcount, attendance, hires / departures, payroll of a month and generating draft payslips, recent activity / audit log.",
        "prompt": "You analyse HR data: KPIs, headcount, payroll summaries, draft payslips and the activity log. Give exact numbers from the tools and a short insight.",
        "kw": ("kpi", "indicateur", "statistique", "stat", "analytics", "effectif", "turnover", "paie", "payroll", "salaire total", "masse salariale", "audit", "activité", "journal", "رواتب", "إحصائيات", "تقرير"),
        "examples": [("Donne-moi les indicateurs RH du mois", "Give me this month's HR indicators", "أعطني مؤشرات الموارد البشرية لهذا الشهر"),
                     ("Génère la paie de ce mois", "Generate this month's payroll", "أنشئ رواتب هذا الشهر")],
    },
    "comms": {
        "label": ("Réunions & notifications", "Meetings & notifications", "الاجتماعات والإشعارات"),
        "route": "Meetings: list, schedule a meeting with its free Wedy video room and agenda; send an in-app notification to an employee.",
        "prompt": "You schedule meetings (each has a free Wedy video room) and notify employees.",
        "kw": ("réunion", "reunion", "meeting", "visio", "agenda", "notifi", "prévenir", "rappel", "اجتماع", "إشعار", "فيديو"),
        "examples": [("Planifie une réunion RH jeudi à 9h30 avec Salma et Imane", "Schedule an HR meeting Thursday at 9:30 with Salma and Imane", "برمج اجتماع الموارد البشرية الخميس 9:30 مع سلمى وإيمان")],
    },
    "general": {
        "label": ("Conseil RH", "HR advice", "استشارة الموارد البشرية"),
        "route": "No data needed: Moroccan Labour Code (Code du travail, loi 65-99) questions, HR best practices, drafting texts, explanations, greetings, "
                 "asking the user for missing information, explaining what Copilot can do.",
        "prompt": "You are the HR adviser. You know the Moroccan Labour Code (loi 65-99), CNSS / AMO and HR good practice. You have no access to company data: if the user "
                  "needs figures or an action, say which kind of request would do it. For legal matters give the rule and advise checking with a legal expert when the stakes are high. "
                  "When asked to write a full document (letter, warning, resignation reply, policy…), put the finished text inside <document titre=\"Short title\" langue=\"fr|en|ar\">…</document> "
                  "with a one-line comment before or after it; to produce an official document for an employee from the company templates, say so and the documents agent will do it.",
        "kw": (),
        "examples": [("Quel est le préavis de démission pour un cadre au Maroc ?", "What is the resignation notice for a manager in Morocco?", "ما مدة إشعار الاستقالة لإطار في المغرب؟")],
    },
}

AGENT_NAMES = tuple(AGENTS)

LANG_NAME = {"fr": "French", "en": "English", "ar": "Arabic"}


def label_of(agent: str, lang: str) -> str:
    fr, en, ar = AGENTS[agent]["label"]
    return {"fr": fr, "en": en, "ar": ar}.get(lang, fr)
