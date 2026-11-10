"""Recruitment agent: job posts, applications, interviews, hiring."""
from datetime import date, datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

from app.agents.runtime import ToolError, brief, ctx, hr_tool, link, name_of, norm, one_person, parse_date, roster, run_handler, tr
from app.routers import annonces as ads_router
from app.routers import candidats as cand_router
from app.routers import employees as emp_router
from app.routers import entretiens as itv_router
from app.schemas.profile import EmployeeUpdate

A = "recruitment"
STAGES = ("new", "screen", "interview", "offer", "rejected")
STAGE_LABEL = {"new": ("Nouveau", "New", "جديد"), "screen": ("Présélection", "Screening", "فرز أولي"), "interview": ("Entretien", "Interview", "مقابلة"),
               "offer": ("Offre", "Offer", "عرض"), "hired": ("Embauché", "Hired", "تم التوظيف"), "rejected": ("Refusé", "Rejected", "مرفوض")}


def _ads() -> list[dict]:
    return run_handler(ads_router.list_annonces, ctx().db) or []


def _ad_of(c: dict, ads: list[dict]) -> Optional[dict]:
    """Same rule as the app: the post the application was sent from, else the post with the same title."""
    cf = c.get("custom_fields") or {}
    if cf.get("ad_id"):
        hit = next((a for a in ads if a["id"] == cf["ad_id"]), None)
        if hit:
            return hit
    pos = norm(c.get("position"))
    same = [a for a in ads if pos and norm(a.get("poste")) == pos]
    return next((a for a in same if a.get("is_active")), same[0] if same else None)


def _find_ad(ref: str, ads: list[dict]) -> dict:
    n = norm(ref)
    hits = [a for a in ads if a["id"] == ref or n == norm(a.get("poste"))] or [a for a in ads if n and n in norm(a.get("poste"))]
    if not hits:
        raise ToolError(tr(f"Aucune annonce « {ref} ».", f"No job post “{ref}”.", f"لا يوجد إعلان «{ref}»."))
    hits.sort(key=lambda a: not a.get("is_active"))
    return hits[0]


@hr_tool(A, ("Annonces d'emploi", "Job posts", "إعلانات التوظيف"))
def job_posts(only_open: bool = False) -> dict:
    """Job posts with their number of applications.

    Args:
      only_open: Only the posts that are still published.
    """
    ads, cands = _ads(), roster({"candidate"})
    out = []
    for a in ads:
        if only_open and not a.get("is_active"):
            continue
        out.append({"id": a["id"], "title": a.get("poste"), "info": a.get("description"), "open": a.get("is_active"), "created": str(a.get("created_at") or "")[:10],
                    "applications": sum(1 for c in cands if (_ad_of(c, ads) or {}).get("id") == a["id"])})
    no_ad = sum(1 for c in cands if not _ad_of(c, ads))
    return {"posts": out, "applications_without_post": no_ad, "links": [link("/app/annonces", tr("Ouvrir Annonces", "Open Job posts", "فتح الإعلانات"))]}


def _post_preview(a: dict) -> dict:
    if not (a.get("content") or "").strip():
        raise ToolError(tr("Le texte de l'annonce est vide : rédigez-le d'abord.", "The ad text is empty: write it first.", "نص الإعلان فارغ: اكتبه أولًا."))
    return {"summary": tr(f"Publier l'annonce « {a['title']} »", f"Publish the job post “{a['title']}”", f"نشر إعلان «{a['title']}»"),
            "details": [[tr("Contrat", "Contract", "العقد"), a.get("contract") or "—"], [tr("Ville", "City", "المدينة"), a.get("city") or "—"], [tr("Texte", "Text", "النص"), a["content"][:420] + ("…" if len(a["content"]) > 420 else "")]]}


@hr_tool(A, ("Publier une annonce", "Publish a job post", "نشر إعلان"), write=True, preview=_post_preview)
def create_job_post(title: str, content: str, contract: str = "CDI", city: str = "", key_points: str = "") -> dict:
    """Publish a job post on the careers page. YOU write `content` (a complete, attractive ad: hook, missions, profile, offer,
    call to apply — plain text, « • » bullets, never invent a salary or perk). Applications arrive in Candidats linked to it.

    Args:
      title: Job title.
      content: Full text of the ad.
      contract: CDI, CDD, Stage or Freelance.
      city: City of the job.
      key_points: Key skills or points, comma separated (used on the social visual).
    """
    body = ads_router.JobAdCreate(poste=title.strip(), description=" · ".join(x for x in (contract, city) if x), competences=key_points or None, contenu=content.strip(), is_active=True)
    ad = run_handler(ads_router.create_annonce, body, ctx().db, ctx().user)
    ad_id = str(ad.get("id"))
    return {"published": True, "id": ad_id, "public_page": f"/postuler/{ad_id}",
            "links": [link("/app/annonces", tr("Diffuser sur LinkedIn, Facebook…", "Promote on LinkedIn, Facebook…", "نشر على لينكدإن وفيسبوك…")), link(f"/postuler/{ad_id}", tr("Page de candidature", "Application page", "صفحة الترشح"))]}


def _close_preview(a: dict) -> dict:
    ad = _find_ad(a["post"], _ads())
    return {"summary": tr(f"{'Rouvrir' if a.get('open') else 'Clôturer'} l'annonce « {ad['poste']} »", f"{'Reopen' if a.get('open') else 'Close'} the post “{ad['poste']}”", f"{'إعادة فتح' if a.get('open') else 'إغلاق'} إعلان «{ad['poste']}»"), "details": []}


@hr_tool(A, ("Clôturer / rouvrir une annonce", "Close / reopen a job post", "إغلاق / إعادة فتح إعلان"), write=True, preview=_close_preview)
def set_job_post_open(post: str, open: bool = False) -> dict:
    """Close a job post (it disappears from the careers page) or reopen it.

    Args:
      post: Title or id of the post.
      open: true to reopen, false to close.
    """
    ad = _find_ad(post, _ads())
    body = ads_router.JobAdBase(poste=ad["poste"], description=ad.get("description"), competences=ad.get("competences"), experience=ad.get("experience"),
                                contenu=ad.get("contenu") or "", image_url=ad.get("image_url"), is_active=bool(open))
    run_handler(ads_router.update_annonce, UUID(ad["id"]), body, ctx().db, ctx().user)
    return {"done": True, "post": ad["poste"], "open": bool(open)}


@hr_tool(A, ("Candidatures", "Applications", "الترشيحات"))
def candidates(job_post: str = "", stage: str = "", query: str = "", limit: int = 30) -> dict:
    """Applications (candidates) with their stage, grouped by job post when no filter is given.

    Args:
      job_post: Title or id of a job post. Use « none » for applications without a post.
      stage: new, screen, interview, offer, hired or rejected.
      query: Part of a name or position.
      limit: Maximum rows (default 30).
    """
    ads, cands = _ads(), roster({"candidate"})
    sel = None
    if job_post and norm(job_post) not in ("none", "sans annonce"):
        sel = _find_ad(job_post, ads)
    rows = []
    for c in cands:
        ad = _ad_of(c, ads)
        if job_post and ((norm(job_post) in ("none", "sans annonce") and ad) or (sel and (not ad or ad["id"] != sel["id"]))):
            continue
        st = (c.get("custom_fields") or {}).get("recruitment_stage") or "new"
        if stage and st != stage:
            continue
        if query and norm(query) not in norm(c.get("full_name")) + " " + norm(c.get("position")):
            continue
        rows.append({"id": c["id"], "name": c.get("full_name"), "position": c.get("position"), "stage": st, "job_post": ad["poste"] if ad else None,
                     "score": (c.get("custom_fields") or {}).get("ai_score") or (c.get("custom_fields") or {}).get("interview_score"), "email": c.get("email"),
                     "source": (c.get("custom_fields") or {}).get("source")})
    by_stage: dict = {}
    for r in rows:
        by_stage[r["stage"]] = by_stage.get(r["stage"], 0) + 1
    return {"total": len(rows), "by_stage": by_stage, "candidates": rows[:limit],
            "links": [link("/app/recruitment" + (f"?ad={sel['id']}" if sel else ""), tr("Ouvrir Recrutement", "Open Recruitment", "فتح التوظيف"))]}


@hr_tool(A, ("Dossier d'un candidat", "Candidate file", "ملف مترشح"))
def candidate_detail(candidate: str) -> dict:
    """Everything known about one candidate: contact, stage, score, skills, summary and interviews.

    Args:
      candidate: Name or id.
    """
    c = one_person(candidate, {"candidate"})
    row = ctx().db.table("employees").select("*").eq("id", c["id"]).limit(1).execute().data[0]
    itv = ctx().db.table("interviews").select("id, date, start_time, type, status, overall_score, recommendation").eq("candidate_id", c["id"]).execute().data or []
    cf = row.get("custom_fields") or {}
    ad = _ad_of(row, _ads())
    return {"name": row.get("full_name"), "email": row.get("email"), "phone": row.get("phone"), "position": row.get("position"), "job_post": ad["poste"] if ad else None,
            "stage": cf.get("recruitment_stage") or "new", "ai_score": cf.get("ai_score"), "source": cf.get("source"), "skills": row.get("skills"),
            "experience": row.get("experience_summary"), "education": row.get("education_summary"), "notes": row.get("notes"),
            "interviews": itv, "links": [link(f"/app/candidats?c={c['id']}", tr("Ouvrir le candidat", "Open the candidate", "فتح المترشح"))]}


def _move_preview(a: dict) -> dict:
    c = one_person(a["candidate"], {"candidate"})
    if a.get("stage") not in STAGES:
        raise ToolError("stage: " + ", ".join(STAGES))
    return {"summary": tr(f"Passer {c['full_name']} à l'étape « {tr(*STAGE_LABEL[a['stage']])} »", f"Move {c['full_name']} to “{tr(*STAGE_LABEL[a['stage']])}”", f"نقل {c['full_name']} إلى «{tr(*STAGE_LABEL[a['stage']])}»"), "details": []}


@hr_tool(A, ("Changer l'étape d'un candidat", "Move a candidate", "نقل مترشح"), write=True, preview=_move_preview)
def move_candidate(candidate: str, stage: str) -> dict:
    """Change the recruitment stage of a candidate (also used to reject: stage = rejected).

    Args:
      candidate: Name or id.
      stage: new, screen, interview, offer or rejected. To hire, use hire_candidate.
    """
    c = one_person(candidate, {"candidate"})
    cf = dict(c.get("custom_fields") or {})
    cf.update({"recruitment_stage": stage, "stage_changed_at": datetime.utcnow().isoformat()})
    run_handler(emp_router.update_employee, UUID(c["id"]), EmployeeUpdate(custom_fields=cf), ctx().db, ctx().user)
    ctx().cache.pop("roster", None)
    return {"done": True, "candidate": c["full_name"], "stage": stage, "links": [link("/app/recruitment", tr("Ouvrir Recrutement", "Open Recruitment", "فتح التوظيف"))]}


@hr_tool(A, ("Entretiens", "Interviews", "المقابلات"))
def interviews(scope: str = "upcoming", candidate: str = "") -> dict:
    """Interviews with candidate names, date, type and status.

    Args:
      scope: upcoming (today and later), past or all.
      candidate: Only this candidate (name or id).
    """
    rows = run_handler(itv_router.list_interviews, ctx().db, ctx().user) or []
    cid = one_person(candidate, {"candidate", "active", "intern"})["id"] if candidate else None
    today = date.today().isoformat()
    out = []
    for r in rows:
        r = r if isinstance(r, dict) else r.model_dump()
        d = str(r.get("date"))
        if (scope == "upcoming" and (d < today or r.get("status") in ("cancelled", "completed"))) or (scope == "past" and d >= today) or (cid and r.get("candidate_id") != cid):
            continue
        out.append({"id": str(r.get("id")), "candidate": name_of(str(r.get("candidate_id"))), "date": d, "start": str(r.get("start_time"))[:5], "end": str(r.get("end_time"))[:5],
                    "type": r.get("type"), "status": r.get("status")})
    return {"count": len(out), "interviews": out[:40], "links": [link("/app/entretiens", tr("Ouvrir Entretiens", "Open Interviews", "فتح المقابلات"))]}


def _to_utc(d: date, hhmm: str) -> datetime:
    h, m = (int(x) for x in str(hhmm)[:5].split(":"))
    try:
        from zoneinfo import ZoneInfo
        return datetime(d.year, d.month, d.day, h, m, tzinfo=ZoneInfo("Africa/Casablanca")).astimezone(timezone.utc)
    except Exception:
        return datetime(d.year, d.month, d.day, h, m, tzinfo=timezone(timedelta(hours=1))).astimezone(timezone.utc)


def _clock(s: str) -> str:
    s = str(s or "").strip().lower().replace("h", ":")
    if s.endswith(":"):
        s += "00"
    hh, _, mm = s.partition(":")
    if not hh.isdigit() or (mm and not mm.isdigit()):
        raise ToolError(tr(f"Heure invalide « {s} » (format HH:MM).", f"Invalid time “{s}” (use HH:MM).", f"وقت غير صالح «{s}» (HH:MM)."))
    return f"{int(hh):02d}:{int(mm or 0):02d}"


def _itv_preview(a: dict) -> dict:
    c = one_person(a["candidate"], {"candidate"})
    d = parse_date(a["date"], "date")
    s, e = _clock(a["start_time"]), _clock(a.get("end_time") or f"{(int(_clock(a['start_time'])[:2]) + 1) % 24:02d}:{_clock(a['start_time'])[3:]}")
    if e <= s:
        raise ToolError(tr("L'heure de fin doit suivre le début.", "The end time must follow the start.", "يجب أن تكون نهاية الوقت بعد البداية."))
    kinds = {"rh": ("RH", "HR", "الموارد البشرية"), "technical": ("technique", "technical", "تقني"), "final": ("final", "final", "نهائي")}
    return {"summary": tr(f"Planifier un entretien {tr(*kinds.get(a.get('type', 'rh'), kinds['rh']))} avec {c['full_name']}", f"Schedule a {tr(*kinds.get(a.get('type', 'rh'), kinds['rh']))} interview with {c['full_name']}", f"برمجة مقابلة {tr(*kinds.get(a.get('type', 'rh'), kinds['rh']))} مع {c['full_name']}"),
            "details": [[tr("Date", "Date", "التاريخ"), d.isoformat()], [tr("Horaire", "Time", "الوقت"), f"{s} – {e}"], [tr("Recruteurs", "Interviewers", "المحاورون"), a.get("interviewers") or "—"],
                        [tr("Réunion", "Meeting", "الاجتماع"), tr("créée avec visio Wedy", "created with Wedy video", "تُنشأ مع فيديو Wedy")]]}


@hr_tool(A, ("Planifier un entretien", "Schedule an interview", "برمجة مقابلة"), write=True, preview=_itv_preview)
def schedule_interview(candidate: str, date: str, start_time: str, end_time: str = "", type: str = "rh", interviewers: str = "", meet_link: str = "") -> dict:
    """Schedule an interview with a candidate. A meeting with the free Wedy video room is created in Réunions and the
    candidate's stage moves to « Entretien ».

    Args:
      candidate: Name or id of the candidate.
      date: Day, YYYY-MM-DD.
      start_time: Start, HH:MM (Morocco time).
      end_time: End, HH:MM (default start + 1 hour).
      type: rh, technical or final.
      interviewers: Names of the interviewers, comma separated (employees).
      meet_link: Optional external video link.
    """
    c = one_person(candidate, {"candidate"})
    d = parse_date(date, "date")
    s = _clock(start_time)
    e = _clock(end_time) if end_time else f"{(int(s[:2]) + 1) % 24:02d}:{s[3:]}"
    people = []
    for n in [x.strip() for x in (interviewers or "").split(",") if x.strip()]:
        try:
            p = one_person(n, {"active", "on-leave"})
            people.append({"employee_id": p["id"], "name": p["full_name"]})
        except ToolError:
            people.append({"employee_id": None, "name": n})
    mins = (int(e[:2]) * 60 + int(e[3:])) - (int(s[:2]) * 60 + int(s[3:]))
    payload = itv_router.InterviewCreate(candidate_id=UUID(c["id"]), date=d, start_time=s, end_time=e, type=type, meet_link=meet_link or None, candidate_name=c["full_name"],
                                         job_title=c.get("position"), interviewers=[itv_router.Person(**p) for p in people],
                                         meeting=itv_router.MeetingSpec(starts_at=_to_utc(d, s), duration_min=max(15, mins), visio_url=meet_link or None))
    iv = run_handler(itv_router.schedule_interview, payload, ctx().db, ctx().user)
    cf = dict(c.get("custom_fields") or {})
    if cf.get("recruitment_stage") in (None, "new", "screen"):
        cf.update({"recruitment_stage": "interview", "stage_changed_at": datetime.utcnow().isoformat()})
        run_handler(emp_router.update_employee, UUID(c["id"]), EmployeeUpdate(custom_fields=cf), ctx().db, ctx().user)
    ctx().cache.pop("roster", None)
    iid = str(iv.get("id") if isinstance(iv, dict) else getattr(iv, "id", ""))
    return {"scheduled": True, "interview_id": iid, "candidate": c["full_name"], "date": d.isoformat(), "time": f"{s}-{e}",
            "links": [link(f"/app/entretiens/{iid}", tr("Ouvrir la salle d'entretien", "Open the interview room", "فتح قاعة المقابلة"))]}


def _hire_preview(a: dict) -> dict:
    c = one_person(a["candidate"], {"candidate"})
    as_ = a.get("as_") or "employee"
    if as_ not in ("employee", "intern"):
        raise ToolError("as_: employee | intern")
    return {"summary": tr(f"Embaucher {c['full_name']} comme {'employé' if as_ == 'employee' else 'stagiaire'}", f"Hire {c['full_name']} as {'an employee' if as_ == 'employee' else 'an intern'}", f"توظيف {c['full_name']} {'كموظف' if as_ == 'employee' else 'كمتدرب'}"),
            "details": [[tr("Poste", "Position", "المنصب"), c.get("position") or "—"], [tr("Date", "Date", "التاريخ"), date.today().isoformat()]]}


@hr_tool(A, ("Embaucher un candidat", "Hire a candidate", "توظيف مترشح"), write=True, preview=_hire_preview)
def hire_candidate(candidate: str, as_: str = "employee") -> dict:
    """Hire a candidate: they leave the candidates and become an active employee (or an intern), with the pipeline stage « hired ».

    Args:
      candidate: Name or id.
      as_: employee or intern.
    """
    c = one_person(candidate, {"candidate"})
    today = date.today().isoformat()
    cf = dict(c.get("custom_fields") or {})
    cf.update({"recruitment_stage": "hired", "stage_changed_at": datetime.utcnow().isoformat()})
    if as_ == "intern":
        run_handler(cand_router.promote_to_intern, UUID(c["id"]), {"internship_start": today}, ctx().db, ctx().user)
    else:
        run_handler(cand_router.promote_to_employee, UUID(c["id"]), {"hire_date": today, "position": c.get("position")}, ctx().db, ctx().user)
    run_handler(emp_router.update_employee, UUID(c["id"]), EmployeeUpdate(custom_fields=cf), ctx().db, ctx().user)
    ctx().cache.pop("roster", None)
    return {"hired": True, "name": c["full_name"], "as": as_, "links": [link(f"/app/{'interns' if as_ == 'intern' else 'employees'}", tr("Ouvrir la liste", "Open the list", "فتح اللائحة"))]}
