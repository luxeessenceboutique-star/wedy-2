"""Entretiens — /api/entretiens: interviews of the candidates (and future interns).

An interview is a row of `interviews` (candidate = an `employees` row with status 'candidate'). Each one can be
linked to a meeting of kind 'int' (`meetings`), and carries its interview sheet (`scorecard`): the questions to
ask, the notes taken during the interview, the scores per criterion, the strengths / concerns and the synthesis.
Columns added by database/migrations/interviews_scorecard.sql.
"""
import json
import mimetypes
import os
import re
import uuid as _uuid
from datetime import date, datetime
from typing import Any, List, Literal, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse, PlainTextResponse
from pydantic import BaseModel, Field
from supabase import Client

from app.config import settings
from app.database import get_db
from app.dependencies import require_hr_or_admin
from app.repositories import entretien_repository
from app.services import ai_service
from app.services import webhooks as webhook_service
from app.services.audit import log_action

router = APIRouter(prefix="/entretiens", tags=["Recruitment - Interviews"])

LANGS = {"fr": "French", "en": "English", "ar": "Arabic"}
TYPE_LABEL = {"rh": "entretien RH", "technical": "entretien technique", "final": "entretien final"}


# ── Models ────────────────────────────────────────────────────────────────────

class Person(BaseModel):
    employee_id: Optional[str] = None
    name: str = Field(min_length=1, max_length=200)


class MeetingSpec(BaseModel):
    starts_at: datetime                      # computed by the browser in the user's time zone
    duration_min: int = Field(60, ge=5, le=480)
    place: Optional[str] = None
    visio_url: Optional[str] = None


class InterviewBase(BaseModel):
    candidate_id: UUID
    recruiter_id: Optional[UUID] = None
    date: date
    start_time: str
    end_time: str
    type: str
    meet_link: Optional[str] = None
    notes: Optional[str] = None
    candidate_name: Optional[str] = None
    job_title: Optional[str] = None
    recruiter_name: Optional[str] = None


class InterviewCreate(InterviewBase):
    slot_id: Optional[UUID] = None
    interviewers: List[Person] = []
    meeting: Optional[MeetingSpec] = None


class InterviewOut(InterviewBase):
    id: UUID
    status: str

    class Config:
        from_attributes = True


class Question(BaseModel):
    id: str
    q: str = Field(max_length=500)
    hint: str = ""
    note: str = ""
    asked: bool = False


class Section(BaseModel):
    id: str
    title: str = Field(max_length=160)
    done: bool = False
    questions: List[Question] = []


class Criterion(BaseModel):
    id: str
    label: str = Field(max_length=120)
    desc: str = ""
    weight: int = Field(1, ge=1, le=3)
    score: int = Field(0, ge=0, le=5)        # 0 = not rated yet
    note: str = ""


class Scorecard(BaseModel):
    source: str = "template"                 # ai | template
    lang: str = "fr"
    generated_at: Optional[str] = None
    sections: List[Section] = []
    criteria: List[Criterion] = []
    strengths: List[str] = []
    concerns: List[str] = []
    notes: str = ""


Recommendation = Literal["strong_yes", "yes", "maybe", "no"]


class FichePatch(BaseModel):
    scorecard: Optional[Scorecard] = None
    summary: Optional[str] = Field(None, max_length=6000)
    recommendation: Optional[Recommendation] = None
    interviewers: Optional[List[Person]] = None


class FinishIn(BaseModel):
    summary: Optional[str] = Field(None, max_length=6000)
    recommendation: Optional[Recommendation] = None
    decision: Literal["next", "offer", "reject", "hire_employee", "hire_intern", "later"] = "later"


# ── Helpers ───────────────────────────────────────────────────────────────────

def _missing_column(e: Exception) -> bool:
    msg = str(e).lower()
    return any(c in msg for c in ("scorecard", "meeting_id", "overall_score", "recommendation", "started_at", "ended_at", "interviewers")) and (
        "column" in msg or "schema cache" in msg or "pgrst204" in msg or "42703" in msg)


def _update(supabase: Client, interview_id: str, row: dict) -> dict:
    try:
        res = supabase.table("interviews").update(row).eq("id", interview_id).execute()
    except Exception as e:
        if _missing_column(e):
            raise HTTPException(status_code=503, detail="interviews_migration_missing")
        raise HTTPException(status_code=400, detail=str(e))
    if not res.data:
        raise HTTPException(status_code=404, detail="Entretien non trouvé")
    return res.data[0]


def _get(supabase: Client, interview_id: str) -> dict:
    res = supabase.table("interviews").select("*").eq("id", interview_id).limit(1).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Entretien non trouvé")
    return res.data[0]


def _candidate(supabase: Client, candidate_id: str) -> dict:
    res = supabase.table("employees").select("*").eq("id", candidate_id).limit(1).execute()
    return (res.data or [{}])[0]


def _ad(supabase: Client, cand: dict) -> Optional[dict]:
    ad_id = (cand.get("custom_fields") or {}).get("ad_id")
    if not ad_id:
        return None
    try:
        res = supabase.table("recruitment_ads").select("*").eq("id", ad_id).limit(1).execute()
        return (res.data or [None])[0]
    except Exception:
        return None


def _meeting(supabase: Client, meeting_id: Optional[str]) -> Optional[dict]:
    if not meeting_id:
        return None
    try:
        res = supabase.table("meetings").select("*").eq("id", meeting_id).limit(1).execute()
        return (res.data or [None])[0]
    except Exception:
        return None


def _cv_file(supabase: Client, cand: dict) -> Optional[dict]:
    """Where the candidate's CV is: the latest 'cv' file of their folder, else the CV sent with the application."""
    try:
        files = supabase.table("employee_files").select("*").eq("employee_id", cand["id"]).eq("file_type", "cv") \
            .order("created_at", desc=True).limit(1).execute().data or []
    except Exception:
        files = []
    if files:
        f = files[0]
        from app.services.storage import ensure_local  # restored from the durable copy if the disk lost it
        path = ensure_local(f["file_path"])
        if path:
            return {"path": path, "name": f.get("name") or os.path.basename(path), "mime": f.get("mime_type"), "source": "folder"}
    url = str((cand.get("custom_fields") or {}).get("cv_url") or "")
    m = re.search(r"/cv/download/([0-9a-fA-F-]{36})", url)
    if m:
        from app.routers.cv import find_public_cv
        path = find_public_cv(m.group(1))
        if path:
            name = os.path.basename(path)[37:] or os.path.basename(path)
            return {"path": path, "name": name, "mime": None, "source": "application"}
    return None


def _cv_text(cv: Optional[dict], limit: int = 9000) -> str:
    if not cv:
        return ""
    try:
        from app.services.cv_parser import extract_raw_text
        with open(cv["path"], "rb") as fh:
            return (extract_raw_text(fh.read(), cv["name"]) or "").strip()[:limit]
    except Exception:
        return ""


def _profile_text(cand: dict) -> str:
    parts = []
    for k, label in (("position", "Poste visé"), ("experience_summary", "Expérience"), ("education_summary", "Formation"), ("bio", "Profil"), ("notes", "Message")):
        if cand.get(k):
            parts.append(f"{label}: {cand[k]}")
    for k, label in (("skills", "Compétences"), ("languages", "Langues"), ("certifications", "Certifications")):
        if cand.get(k):
            parts.append(f"{label}: {', '.join(map(str, cand[k]))}")
    return "\n".join(parts)


def overall_score(criteria: List[dict]) -> Optional[int]:
    """Weighted average of the rated criteria, on 100. None while nothing is rated."""
    rated = [c for c in criteria if int(c.get("score") or 0) > 0]
    if not rated:
        return None
    total = sum(int(c.get("weight") or 1) for c in rated)
    return round(sum(int(c["score"]) / 5 * int(c.get("weight") or 1) for c in rated) / total * 100)


def _sid() -> str:
    return _uuid.uuid4().hex[:8]


def _split_skills(text: str) -> List[str]:
    out = []
    for part in re.split(r"[,;\n•·|/]+", text or ""):
        part = re.sub(r"^[\s\-–*\d.)]+", "", part).strip()
        if 1 < len(part) <= 40 and part.lower() not in (x.lower() for x in out):
            out.append(part)
    return out[:4]


# Standard sheet (used when Wedy's AI is not available): 3 languages, adapted to the interview type and the job post.
_TPL = {
    "fr": {
        "intro": ("Accueil et présentation", [("Présentez-vous en quelques minutes : votre parcours et ce qui vous amène ici.", "Clarté, structure, aisance"),
                                             ("Qu'est-ce qui vous a donné envie de postuler à ce poste ?", "Motivation réelle, connaissance de l'entreprise")]),
        "cv": ("Parcours et CV", [("Quelle expérience de votre CV est la plus proche de ce poste ? Qu'y avez-vous fait concrètement ?", "Rôle personnel vs équipe, résultats chiffrés"),
                                  ("Quelle a été votre plus grande difficulté professionnelle et comment l'avez-vous surmontée ?", "Recul, capacité d'apprentissage")]),
        "tech": ("Compétences pour le poste", []),
        "tech_q": "Pouvez-vous décrire une situation où vous avez utilisé « {s} » ? Quel était le résultat ?",
        "tech_generic": [("Quelles compétences clés apportez-vous pour réussir dans ce poste ?", "Lien direct avec la fiche de poste"),
                         ("Comment vous organisez-vous quand plusieurs priorités arrivent en même temps ?", "Méthode, exemples concrets")],
        "case": ("Mise en situation", [("Vous rejoignez l'équipe demain : quelles seraient vos priorités pendant le premier mois ?", "Projection, réalisme"),
                                      ("Un collègue n'est pas d'accord avec votre approche sur un dossier important. Comment réagissez-vous ?", "Communication, esprit d'équipe")]),
        "final": ("Projet et conditions", [("Où vous voyez-vous dans trois ans ?", "Cohérence avec l'évolution possible"),
                                         ("Quelles sont vos attentes (rémunération, date de disponibilité, mobilité) ?", "Compatibilité avec l'offre")]),
        "close": ("Questions du candidat et suite", [("Avez-vous des questions sur le poste, l'équipe ou l'entreprise ?", "Pertinence des questions"),
                                                    ("Présenter les prochaines étapes et le délai de réponse.", "")]),
        "criteria": [("Communication", "Clarté, écoute, capacité à convaincre", 2), ("Compétences pour le poste", "Maîtrise des compétences demandées", 3),
                     ("Expérience pertinente", "Expériences proches des missions du poste", 2), ("Motivation", "Intérêt pour le poste et l'entreprise", 2),
                     ("Adéquation équipe et culture", "Valeurs, façon de travailler", 1)],
        "solve": ("Résolution de problèmes", "Raisonnement, méthode, autonomie", 2),
    },
    "en": {
        "intro": ("Welcome and introduction", [("Introduce yourself in a few minutes: your background and what brings you here.", "Clarity, structure, ease"),
                                              ("What made you want to apply for this position?", "Real motivation, knowledge of the company")]),
        "cv": ("Background and CV", [("Which experience on your CV is closest to this role? What did you do concretely?", "Personal role vs team, measurable results"),
                                     ("What was your biggest professional difficulty and how did you overcome it?", "Self-awareness, ability to learn")]),
        "tech": ("Skills for the role", []),
        "tech_q": "Can you describe a situation where you used “{s}”? What was the result?",
        "tech_generic": [("Which key skills do you bring to succeed in this role?", "Direct link with the job description"),
                         ("How do you organise yourself when several priorities arrive at once?", "Method, concrete examples")],
        "case": ("Scenario", [("You join the team tomorrow: what would your priorities be in the first month?", "Projection, realism"),
                             ("A colleague disagrees with your approach on an important file. How do you react?", "Communication, team spirit")]),
        "final": ("Plans and conditions", [("Where do you see yourself in three years?", "Fit with possible career path"),
                                          ("What are your expectations (salary, availability date, mobility)?", "Fit with the offer")]),
        "close": ("Candidate's questions and next steps", [("Do you have any questions about the role, the team or the company?", "Relevance of the questions"),
                                                          ("Present the next steps and when they will hear back.", "")]),
        "criteria": [("Communication", "Clarity, listening, persuasiveness", 2), ("Skills for the role", "Command of the required skills", 3),
                     ("Relevant experience", "Experience close to the role's tasks", 2), ("Motivation", "Interest in the role and the company", 2),
                     ("Team and culture fit", "Values, way of working", 1)],
        "solve": ("Problem solving", "Reasoning, method, autonomy", 2),
    },
    "ar": {
        "intro": ("الاستقبال والتعريف", [("عرّف بنفسك في بضع دقائق: مسارك وما الذي جاء بك إلى هنا.", "الوضوح، التنظيم، الثقة"),
                                         ("ما الذي دفعك إلى الترشح لهذا المنصب؟", "دافع حقيقي، معرفة بالشركة")]),
        "cv": ("المسار والسيرة الذاتية", [("أي تجربة في سيرتك هي الأقرب لهذا المنصب؟ ماذا أنجزت فيها بالتحديد؟", "الدور الشخصي مقابل الفريق، نتائج ملموسة"),
                                           ("ما أكبر صعوبة مهنية واجهتها وكيف تغلبت عليها؟", "النضج، القدرة على التعلم")]),
        "tech": ("الكفاءات المطلوبة للمنصب", []),
        "tech_q": "هل يمكنك وصف موقف استخدمت فيه «{s}»؟ وما كانت النتيجة؟",
        "tech_generic": [("ما الكفاءات الأساسية التي تقدمها للنجاح في هذا المنصب؟", "ارتباط مباشر بوصف المنصب"),
                         ("كيف تنظم عملك عندما تتزامن عدة أولويات؟", "المنهجية، أمثلة ملموسة")],
        "case": ("وضعية عملية", [("إذا التحقت بالفريق غدًا، ما أولوياتك خلال الشهر الأول؟", "الاستشراف، الواقعية"),
                                ("زميل لا يتفق مع طريقتك في ملف مهم. كيف تتصرف؟", "التواصل، روح الفريق")]),
        "final": ("المشروع والشروط", [("أين ترى نفسك بعد ثلاث سنوات؟", "الانسجام مع التطور الممكن"),
                                     ("ما هي توقعاتك (الأجر، تاريخ التوفر، التنقل)؟", "التوافق مع العرض")]),
        "close": ("أسئلة المترشح والخطوات القادمة", [("هل لديك أسئلة حول المنصب أو الفريق أو الشركة؟", "وجاهة الأسئلة"),
                                                    ("تقديم الخطوات القادمة وموعد الرد.", "")]),
        "criteria": [("التواصل", "الوضوح، الإنصات، الإقناع", 2), ("الكفاءات المطلوبة", "التمكن من الكفاءات المطلوبة", 3),
                     ("الخبرة الملائمة", "خبرات قريبة من مهام المنصب", 2), ("الدافعية", "الاهتمام بالمنصب والشركة", 2),
                     ("الانسجام مع الفريق والثقافة", "القيم، طريقة العمل", 1)],
        "solve": ("حل المشكلات", "التفكير، المنهجية، الاستقلالية", 2),
    },
}


def template_scorecard(kind: str, lang: str, ad: Optional[dict], cand: dict) -> dict:
    T = _TPL.get(lang, _TPL["fr"])
    skills = _split_skills((ad or {}).get("competences") or "") or [s for s in (cand.get("skills") or [])][:3]

    def sec(key, items):
        return {"id": _sid(), "title": T[key][0], "done": False,
                "questions": [{"id": _sid(), "q": q, "hint": h, "note": "", "asked": False} for q, h in items]}

    tech_items = [(T["tech_q"].format(s=s), "") for s in skills] or T["tech_generic"]
    order = ["intro", "cv", "tech", "case", "close"] if kind != "final" else ["intro", "cv", "tech", "final", "close"]
    if kind == "technical":
        order = ["intro", "tech", "case", "close"]
    sections = [sec(k, tech_items if k == "tech" else T[k][1]) for k in order]
    crit = list(T["criteria"])
    if kind == "technical":
        crit.insert(2, T["solve"])
    return {
        "source": "template", "lang": lang, "generated_at": datetime.utcnow().isoformat(),
        "sections": sections,
        "criteria": [{"id": _sid(), "label": l, "desc": d, "weight": w, "score": 0, "note": ""} for l, d, w in crit],
        "strengths": [], "concerns": [], "notes": "",
    }


def ai_scorecard(kind: str, lang: str, ad: Optional[dict], cand: dict, cv_text: str) -> dict:
    language = LANGS.get(lang, "French")
    job = "\n".join(f"{k}: {ad[k]}" for k in ("poste", "description", "competences", "experience") if ad and ad.get(k)) \
        or f"Poste: {cand.get('position') or 'non précisé'}"
    if ad and ad.get("contenu"):
        job += "\nAnnonce:\n" + str(ad["contenu"])[:2500]
    system = ("You are Wedy, the recruitment assistant of a Moroccan company. You prepare structured interview sheets. "
              "Base every question on the job post and on what the CV really says. Never invent facts about the candidate.")
    user = (
        f"Prepare the sheet for a {TYPE_LABEL.get(kind, 'entretien')} with {cand.get('full_name')}.\n\n"
        f"JOB POST\n{job}\n\nCANDIDATE PROFILE\n{_profile_text(cand) or '(empty)'}\n\nCV TEXT\n{cv_text or '(no CV available)'}\n\n"
        f"Write in {language}. Reply with JSON only, no other text:\n"
        '{"sections": [{"title": "...", "questions": [{"q": "question to ask", "hint": "what to listen for (max 10 words)"}]}], '
        '"criteria": [{"label": "...", "desc": "max 8 words", "weight": 1-3}]}\n'
        "Rules: 4 to 6 sections in interview order (opening first, the candidate's questions and next steps last), "
        "2 to 4 questions each; at least 3 questions refer to precise elements of the CV (a past job, a project, a gap, a skill) "
        "and say so; 5 or 6 criteria, weight 3 for what matters most for this job."
    )
    raw = ai_service.complete(system, user, 2200)
    data = json.loads(raw[raw.find("{"): raw.rfind("}") + 1])
    sections = []
    for s in data.get("sections") or []:
        qs = [{"id": _sid(), "q": str(q.get("q", "")).strip()[:500], "hint": str(q.get("hint", "")).strip()[:160], "note": "", "asked": False}
              for q in (s.get("questions") or []) if isinstance(q, dict) and str(q.get("q", "")).strip()]
        if str(s.get("title", "")).strip() and qs:
            sections.append({"id": _sid(), "title": str(s["title"]).strip()[:160], "done": False, "questions": qs[:5]})
    criteria = []
    for c in data.get("criteria") or []:
        if isinstance(c, dict) and str(c.get("label", "")).strip():
            try:
                w = max(1, min(3, int(c.get("weight") or 1)))
            except (TypeError, ValueError):
                w = 1
            criteria.append({"id": _sid(), "label": str(c["label"]).strip()[:120], "desc": str(c.get("desc", "")).strip()[:160], "weight": w, "score": 0, "note": ""})
    if len(sections) < 2 or len(criteria) < 2:
        raise ValueError("ai_incomplete")
    return {"source": "ai", "lang": lang, "generated_at": datetime.utcnow().isoformat(), "sections": sections[:7],
            "criteria": criteria[:7], "strengths": [], "concerns": [], "notes": ""}


def _sync_meeting_agenda(supabase: Client, iv: dict, scorecard: dict) -> None:
    """The meeting's agenda follows the sheet's sections (checked when the section is done)."""
    if not iv.get("meeting_id"):
        return
    try:
        supabase.table("meetings").update({
            "agenda": [{"t": s["title"][:300], "done": bool(s.get("done")), "ai": scorecard.get("source") == "ai"} for s in scorecard.get("sections") or []],
            "updated_at": datetime.utcnow().isoformat(),
        }).eq("id", iv["meeting_id"]).execute()
    except Exception:
        pass


def _create_meeting(supabase: Client, user_id: str, cand: dict, kind: str, spec: MeetingSpec, people: List[Person], meet_link: Optional[str]) -> Optional[str]:
    title = f"Entretien · {cand.get('full_name') or ''}" + (f" · {cand['position']}" if cand.get("position") else "")
    participants = [p.model_dump() for p in people] + [{"employee_id": None, "name": cand.get("full_name") or "Candidat"}]
    try:
        res = supabase.table("meetings").insert({
            "title": title[:200], "kind": "int", "starts_at": spec.starts_at.isoformat(), "duration_min": spec.duration_min,
            "place": spec.place, "visio_url": spec.visio_url or meet_link, "participants": participants,
            "prep_notes": f"{TYPE_LABEL.get(kind, 'Entretien').capitalize()} — fiche d'entretien dans Wedy › Entretiens.",
            "created_by": user_id,
        }).execute()
        return (res.data or [{}])[0].get("id")
    except Exception:
        return None  # meetings table not migrated: the interview still exists


# ── List / create / status ───────────────────────────────────────────────────

@router.get("", response_model=List[InterviewOut])
def list_interviews(supabase: Client = Depends(get_db), _user: dict = Depends(require_hr_or_admin)):
    res = entretien_repository.list_interviews(supabase)
    return res.data or []


@router.get("/board")
def interviews_board(supabase: Client = Depends(get_db), _user: dict = Depends(require_hr_or_admin)):
    """Every interview with what the Entretiens page shows (no CV bytes, no full sheet)."""
    rows = entretien_repository.list_interviews(supabase).data or []
    ids = sorted({r["candidate_id"] for r in rows if r.get("candidate_id")})
    people: dict[str, dict] = {}
    with_cv: set[str] = set()
    if ids:
        for e in supabase.table("employees").select("id, full_name, position, photo_url, status, email, custom_fields").in_("id", ids).execute().data or []:
            people[e["id"]] = e
            if re.search(r"/cv/download/", str((e.get("custom_fields") or {}).get("cv_url") or "")):
                with_cv.add(e["id"])
        try:
            for f in supabase.table("employee_files").select("employee_id").in_("employee_id", ids).eq("file_type", "cv").execute().data or []:
                with_cv.add(f["employee_id"])
        except Exception:
            pass
    out = []
    for r in rows:
        sc = r.get("scorecard") or {}
        crit = sc.get("criteria") or []
        out.append({
            **{k: r.get(k) for k in ("id", "candidate_id", "date", "start_time", "end_time", "type", "status", "meet_link", "notes",
                                     "meeting_id", "overall_score", "recommendation", "started_at", "ended_at", "interviewers", "created_at")},
            "has_fiche": bool(sc.get("sections")),
            "fiche_source": sc.get("source"),
            "rated": sum(1 for c in crit if int(c.get("score") or 0) > 0),
            "criteria": len(crit),
            "candidate": {k: (people.get(r.get("candidate_id")) or {}).get(k) for k in ("id", "full_name", "position", "photo_url", "status", "email")},
            "stage": ((people.get(r.get("candidate_id")) or {}).get("custom_fields") or {}).get("recruitment_stage"),
            "has_cv": r.get("candidate_id") in with_cv,
        })
    return {"data": out, "migrated": bool(rows) and "scorecard" in rows[0]}


@router.post("", response_model=InterviewOut)
def schedule_interview(payload: InterviewCreate, supabase: Client = Depends(get_db), current_user: dict = Depends(require_hr_or_admin)):
    # candidate_name / job_title / recruiter_name are display-only: not columns of interviews
    data = payload.model_dump(exclude={"slot_id", "candidate_name", "job_title", "recruiter_name", "interviewers", "meeting"})
    data["date"] = str(data["date"])
    data["candidate_id"] = str(data["candidate_id"])
    if data.get("recruiter_id"):
        data["recruiter_id"] = str(data["recruiter_id"])
    data["status"] = "confirmed"

    res = entretien_repository.create_interview(supabase, data)
    if not res.data:
        raise HTTPException(status_code=500, detail="Erreur lors de la planification")
    interview = res.data[0]

    if payload.slot_id:
        entretien_repository.reserve_slot(supabase, str(payload.slot_id), interview["id"])

    people = list(payload.interviewers)
    if not people and payload.recruiter_name:
        people = [Person(name=payload.recruiter_name)]
    extra: dict[str, Any] = {}
    if people:
        extra["interviewers"] = [p.model_dump() for p in people]
    if payload.meeting:
        cand = _candidate(supabase, data["candidate_id"])
        mid = _create_meeting(supabase, current_user["id"], cand, payload.type, payload.meeting, people, payload.meet_link)
        if mid:
            extra["meeting_id"] = mid
    if extra:
        try:
            interview = supabase.table("interviews").update(extra).eq("id", interview["id"]).execute().data[0]
        except Exception:
            pass  # columns not migrated yet: the interview is planned anyway
    log_action(supabase, current_user["id"], "CREATE", "interview", interview["id"])
    return interview


@router.patch("/{id}/status")
def update_interview_status(id: UUID, status: str, supabase: Client = Depends(get_db), _user: dict = Depends(require_hr_or_admin)):
    res = entretien_repository.update_interview_status(supabase, str(id), status)
    if not res.data:
        raise HTTPException(status_code=404, detail="Entretien non trouvé")
    return res.data[0]


# ── Interview room ────────────────────────────────────────────────────────────

@router.get("/{id}")
def get_interview(id: UUID, supabase: Client = Depends(get_db), _user: dict = Depends(require_hr_or_admin)):
    """The interview, its candidate, job post, meeting, CV availability and the candidate's other interviews."""
    iv = _get(supabase, str(id))
    cand = _candidate(supabase, iv["candidate_id"])
    if not cand:
        raise HTTPException(status_code=404, detail="Candidat introuvable")
    cv = _cv_file(supabase, cand)
    others = [o for o in (supabase.table("interviews").select("*").eq("candidate_id", iv["candidate_id"]).execute().data or []) if o["id"] != iv["id"]]
    return {
        "interview": iv,
        "candidate": cand,
        "ad": _ad(supabase, cand),
        "meeting": _meeting(supabase, iv.get("meeting_id")),
        "cv": {"name": cv["name"], "source": cv["source"], "mime": cv["mime"] or mimetypes.guess_type(cv["name"])[0]} if cv else None,
        "history": [{k: o.get(k) for k in ("id", "date", "start_time", "type", "status", "overall_score", "recommendation", "summary")}
                    for o in sorted(others, key=lambda o: (o.get("date") or "", o.get("start_time") or ""))],
        "migrated": "scorecard" in iv,
    }


@router.get("/{id}/cv")
def get_interview_cv(id: UUID, format: str = Query("file", pattern="^(file|text)$"), supabase: Client = Depends(get_db), _user: dict = Depends(require_hr_or_admin)):
    iv = _get(supabase, str(id))
    cv = _cv_file(supabase, _candidate(supabase, iv["candidate_id"]))
    if not cv:
        raise HTTPException(status_code=404, detail="no_cv")
    if format == "text":
        return PlainTextResponse(_cv_text(cv, 20000))
    return FileResponse(cv["path"], media_type=cv["mime"] or mimetypes.guess_type(cv["name"])[0] or "application/octet-stream",
                        headers={"Content-Disposition": f'inline; filename="{re.sub(r"[^A-Za-z0-9._-]", "_", cv["name"])}"'})


@router.post("/{id}/fiche")
def generate_fiche(id: UUID, lang: str = Query("fr"), mode: str = Query("ai", pattern="^(ai|template)$"),
                   supabase: Client = Depends(get_db), current_user: dict = Depends(require_hr_or_admin)):
    """Generate the interview sheet: Wedy writes it from the job post and the CV; the standard sheet when the AI is not available."""
    iv = _get(supabase, str(id))
    if "scorecard" not in iv:
        raise HTTPException(status_code=503, detail="interviews_migration_missing")
    cand = _candidate(supabase, iv["candidate_id"])
    ad = _ad(supabase, cand)
    lang = lang if lang in LANGS else "fr"
    fallback_reason = None
    sc = None
    if mode == "ai":
        try:
            sc = ai_scorecard(iv.get("type") or "rh", lang, ad, cand, _cv_text(_cv_file(supabase, cand)))
        except Exception as e:
            fallback_reason = "ai_unavailable" if "key" in str(e).lower() or "api" in str(e).lower() else "ai_failed"
    if sc is None:
        sc = template_scorecard(iv.get("type") or "rh", lang, ad, cand)
    row = _update(supabase, str(id), {"scorecard": sc, "overall_score": None})
    _sync_meeting_agenda(supabase, iv, sc)
    log_action(supabase, current_user["id"], "GENERATE", "interview_sheet", str(id))
    return {"interview": row, "fallback": fallback_reason}


@router.patch("/{id}/fiche")
def save_fiche(id: UUID, payload: FichePatch, supabase: Client = Depends(get_db), _user: dict = Depends(require_hr_or_admin)):
    """Autosave of the sheet during the interview (notes, scores, synthesis)."""
    iv = _get(supabase, str(id))
    row: dict[str, Any] = {}
    if payload.scorecard is not None:
        sc = payload.scorecard.model_dump()
        row["scorecard"] = sc
        row["overall_score"] = overall_score(sc["criteria"])
    if payload.summary is not None:
        row["summary"] = payload.summary
    if payload.recommendation is not None:
        row["recommendation"] = payload.recommendation
    if payload.interviewers is not None:
        row["interviewers"] = [p.model_dump() for p in payload.interviewers]
    if not row:
        raise HTTPException(status_code=400, detail="Rien à enregistrer")
    out = _update(supabase, str(id), row)
    if payload.scorecard is not None:
        old = [bool(s.get("done")) for s in ((iv.get("scorecard") or {}).get("sections") or [])]
        if old != [s.done for s in payload.scorecard.sections]:
            _sync_meeting_agenda(supabase, iv, row["scorecard"])
    return out


@router.post("/{id}/start")
def start_interview(id: UUID, supabase: Client = Depends(get_db), current_user: dict = Depends(require_hr_or_admin)):
    iv = _get(supabase, str(id))
    if iv.get("started_at"):
        return iv
    out = _update(supabase, str(id), {"started_at": datetime.utcnow().isoformat(), "status": "confirmed" if iv.get("status") == "pending" else iv.get("status")})
    log_action(supabase, current_user["id"], "START", "interview", str(id))
    return out


@router.post("/{id}/meeting")
def link_meeting(id: UUID, spec: MeetingSpec, supabase: Client = Depends(get_db), current_user: dict = Depends(require_hr_or_admin)):
    """Create the meeting of an interview planned without one (e.g. booked from the careers page)."""
    iv = _get(supabase, str(id))
    if iv.get("meeting_id") and _meeting(supabase, iv["meeting_id"]):
        raise HTTPException(status_code=409, detail="meeting_exists")
    cand = _candidate(supabase, iv["candidate_id"])
    people = [Person(**p) for p in (iv.get("interviewers") or []) if isinstance(p, dict) and p.get("name")]
    mid = _create_meeting(supabase, current_user["id"], cand, iv.get("type") or "rh", spec, people, iv.get("meet_link"))
    if not mid:
        raise HTTPException(status_code=503, detail="meetings_table_missing")
    out = _update(supabase, str(id), {"meeting_id": mid})
    if (iv.get("scorecard") or {}).get("sections"):
        _sync_meeting_agenda(supabase, out, iv["scorecard"])
    return {"interview": out, "meeting": _meeting(supabase, mid)}


@router.post("/{id}/synthese")
def draft_synthesis(id: UUID, lang: str = Query("fr"), supabase: Client = Depends(get_db), _user: dict = Depends(require_hr_or_admin)):
    """Wedy drafts the synthesis and a recommendation from the notes and scores only (not saved: the page shows it)."""
    iv = _get(supabase, str(id))
    sc = iv.get("scorecard") or {}
    lines = []
    for s in sc.get("sections") or []:
        for q in s.get("questions") or []:
            if (q.get("note") or "").strip():
                lines.append(f"- [{s.get('title')}] {q.get('q')} → {q['note'].strip()}")
    for c in sc.get("criteria") or []:
        if int(c.get("score") or 0) > 0 or (c.get("note") or "").strip():
            lines.append(f"- Critère {c.get('label')} (poids {c.get('weight')}): {c.get('score') or 'non noté'}/5 {c.get('note') or ''}".strip())
    for k, label in (("strengths", "Point fort"), ("concerns", "Point de vigilance")):
        lines += [f"- {label}: {x}" for x in sc.get(k) or []]
    if (sc.get("notes") or "").strip():
        lines.append(f"- Notes libres: {sc['notes'].strip()}")
    if not lines:
        raise HTTPException(status_code=422, detail="nothing_to_summarize")
    cand = _candidate(supabase, iv["candidate_id"])
    system = ("You are Wedy, a recruitment assistant. You write interview syntheses only from the interviewer's notes and scores. "
              "Never invent facts, figures or opinions that are not in the notes.")
    user = (f"Candidate: {cand.get('full_name')} — position: {cand.get('position') or 'n/a'} — {TYPE_LABEL.get(iv.get('type'), 'entretien')}.\n"
            f"Overall score: {overall_score(sc.get('criteria') or []) or 'n/a'}/100.\nNotes:\n" + "\n".join(lines)[:8000] +
            f"\n\nWrite in {LANGS.get(lang, 'French')}. Reply with JSON only: "
            '{"summary": "4-6 sentences: overall impression, strengths, concerns, fit for the role", '
            '"recommendation": "strong_yes|yes|maybe|no"}')
    try:
        raw = ai_service.complete(system, user, 700)
        data = json.loads(raw[raw.find("{"): raw.rfind("}") + 1])
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"ai_unavailable: {e}")
    rec = data.get("recommendation")
    return {"summary": str(data.get("summary") or "").strip(), "recommendation": rec if rec in ("strong_yes", "yes", "maybe", "no") else None}


@router.post("/{id}/finish")
def finish_interview(id: UUID, payload: FinishIn, supabase: Client = Depends(get_db), current_user: dict = Depends(require_hr_or_admin)):
    """End the interview: sheet closed, the candidate moves in the pipeline according to the decision, the meeting gets the minutes."""
    iv = _get(supabase, str(id))
    sc = iv.get("scorecard") or {}
    score = overall_score(sc.get("criteria") or [])
    now = datetime.utcnow().isoformat()
    row: dict[str, Any] = {"status": "completed", "ended_at": now, "overall_score": score}
    if not iv.get("started_at"):
        row["started_at"] = now
    if payload.summary is not None:
        row["summary"] = payload.summary
    if payload.recommendation is not None:
        row["recommendation"] = payload.recommendation
    out = _update(supabase, str(id), row)

    cand = _candidate(supabase, iv["candidate_id"])
    custom = dict(cand.get("custom_fields") or {})
    custom["interview_score"] = score
    custom["last_interview_id"] = str(id)
    stage = {"next": "interview", "offer": "offer", "reject": "rejected", "hire_employee": "hired", "hire_intern": "hired"}.get(payload.decision)
    if stage:
        custom["recruitment_stage"] = stage
        custom["stage_changed_at"] = now
    update: dict[str, Any] = {"custom_fields": custom}
    today = date.today().isoformat()
    if payload.decision == "hire_employee":
        update.update({"status": "active", "hire_date": today})
    elif payload.decision == "hire_intern":
        update.update({"status": "intern", "internship_start": today})
    if cand.get("status") in ("candidate", None) or payload.decision not in ("hire_employee", "hire_intern"):
        supabase.table("employees").update(update).eq("id", iv["candidate_id"]).execute()
    if payload.decision == "hire_employee":
        webhook_service.emit(supabase, "candidate.hired", {"employee_id": iv["candidate_id"], "employee": cand.get("full_name"), "position": cand.get("position")})

    if iv.get("meeting_id"):
        decision_txt = {"next": "Entretien suivant à planifier", "offer": "Passage à l'offre", "reject": "Candidature non retenue",
                        "hire_employee": "Embauche", "hire_intern": "Accueil en stage"}.get(payload.decision)
        try:
            supabase.table("meetings").update({
                "summary": (payload.summary or iv.get("summary") or "").strip() or None,
                "decisions": ([decision_txt] if decision_txt else []) + ([f"Score global : {score}/100"] if score is not None else []),
                "agenda": [{"t": s["title"][:300], "done": bool(s.get("done")), "ai": sc.get("source") == "ai"} for s in sc.get("sections") or []],
                "updated_at": now,
            }).eq("id", iv["meeting_id"]).execute()
        except Exception:
            pass
    log_action(supabase, current_user["id"], "FINISH", "interview", str(id))
    return {"interview": out, "decision": payload.decision, "overall_score": score}
