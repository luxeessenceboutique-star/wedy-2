"""Main entry point for WEDY RH Platform v2.0 (Supabase SDK Version)"""
from fastapi import FastAPI, Depends, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from loguru import logger
import traceback
import os
import json
from datetime import date, datetime


class _DateSafeResponse(JSONResponse):
    """JSONResponse that serializes date/datetime objects as ISO strings."""
    def render(self, content) -> bytes:
        return json.dumps(
            content,
            default=lambda o: o.isoformat() if isinstance(o, (date, datetime)) else str(o),
            allow_nan=False,
        ).encode("utf-8")

from app.config import settings
from app.routers import (
    auth, profiles, employees, interns, documents, cv,
    requests, departments, notifications, dashboard,
    templates, leaves, analytics, copilot, payroll,
    audit_log, generate, smartdb, performance, users, assets,
    webhooks, employee_onboarding, training, talents, portal, orgchart,
    tenders, annonces, candidats, creneaux, entretiens, contract_types, planning_notes, meetings
)
from app.routers import settings as settings_router  # not `settings`: that name is the app config
from app.routers import integrations
from app.routers import visio

from app.dependencies import get_current_user  # used in protected upload below

app = FastAPI(
    title=settings.APP_NAME,
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    default_response_class=_DateSafeResponse,
)

# CORS
origins = settings.ALLOWED_ORIGINS.split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router, prefix="/api")
app.include_router(profiles.router, prefix="/api")
app.include_router(employees.router, prefix="/api")
app.include_router(interns.router, prefix="/api")
app.include_router(documents.router, prefix="/api")
app.include_router(cv.router, prefix="/api")
app.include_router(requests.router, prefix="/api")
app.include_router(departments.router, prefix="/api")
app.include_router(contract_types.router, prefix="/api")
app.include_router(planning_notes.router, prefix="/api")
app.include_router(meetings.router, prefix="/api")
app.include_router(settings_router.router, prefix="/api")
app.include_router(integrations.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(templates.router, prefix="/api")
app.include_router(leaves.router,    prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(copilot.router,   prefix="/api")
app.include_router(payroll.router,   prefix="/api")
app.include_router(audit_log.router, prefix="/api")
app.include_router(generate.router,  prefix="/api")
app.include_router(smartdb.router,   prefix="/api")
app.include_router(performance.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(assets.router, prefix="/api")
app.include_router(webhooks.router, prefix="/api")
app.include_router(employee_onboarding.router, prefix="/api")
app.include_router(training.router, prefix="/api")
app.include_router(talents.router, prefix="/api")
app.include_router(portal.router, prefix="/api")
app.include_router(orgchart.router, prefix="/api")
app.include_router(tenders.router, prefix="/api")
app.include_router(annonces.router, prefix="/api")
app.include_router(candidats.router, prefix="/api")
app.include_router(creneaux.router, prefix="/api")
app.include_router(entretiens.router, prefix="/api")
app.include_router(visio.router, prefix="/api")


# Protected Uploads Endpoint
@app.get("/api/uploads/{file_path:path}")
async def get_protected_upload(
    file_path: str,
    _current_user: dict = Depends(get_current_user)
):
    """Serve files only to authenticated users"""
    full_path = os.path.join(settings.UPLOAD_DIR, file_path)
    if not os.path.exists(full_path):
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Fichier non trouvé")
    return FileResponse(full_path)

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    body = None
    try:
        body = await request.json()
    except Exception:
        pass
    logger.warning(f"[422] {request.method} {request.url.path} | errors={exc.errors()} | body={body}")
    return JSONResponse(status_code=422, content={"detail": exc.errors()})

# Supabase migrations that were not run: name the missing column / table and the file that adds it.
_MIGRATION_FOR = {
    ("employees", "custom_fields"): "rh_schema_fixes.sql", ("employees", "remuneration"): "rh_schema_fixes.sql",
    ("interviews", "scorecard"): "interviews_scorecard.sql", ("interviews", "meeting_id"): "interviews_scorecard.sql",
    ("interviews", "interviewers"): "interviews_scorecard.sql", ("interviews", "started_at"): "interviews_scorecard.sql",
    ("interviews", "ended_at"): "interviews_scorecard.sql", ("interviews", "overall_score"): "interviews_scorecard.sql",
    ("interviews", "recommendation"): "interviews_scorecard.sql", ("interviews", "summary"): "interviews_scorecard.sql",
}


def _schema_drift_detail(exc: Exception) -> str | None:
    import re as _re
    msg = str(getattr(exc, "message", "") or exc)
    code = str(getattr(exc, "code", "") or "")
    m = _re.search(r"Could not find the '([^']+)' column of '([^']+)'", msg)
    if code == "PGRST204" or m:
        if not m:
            return None
        col, table = m.group(1), m.group(2)
        mig = _MIGRATION_FOR.get((table, col))
        return (f"La colonne « {col} » manque dans la table {table} de Supabase. "
                + (f"Exécutez la migration backend/database/migrations/{mig} dans l'éditeur SQL de Supabase." if mig
                   else "Une migration de la base n'a pas été exécutée."))
    if code == "23503" and "interviews_candidate_id_fkey" in msg:
        return ("La table interviews est encore reliée à « profiles » au lieu des candidats (employees). "
                "Exécutez la migration backend/database/migrations/interviews_candidate_fk.sql dans l'éditeur SQL de Supabase.")
    t = _re.search(r"Could not find the table '(?:[^'.]+\.)?([^']+)'", msg)
    if code == "PGRST205" or t:
        name = t.group(1) if t else '?'
        hint = " Exécutez backend/database/migrations/rh_schema_fixes.sql dans l'éditeur SQL de Supabase." if name in ("intern_onboarding", "intern_evaluations", "import_logs") else " Une migration n'a pas été exécutée."
        return f"La table « {name} » n'existe pas dans Supabase.{hint}"
    return None


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    drift = _schema_drift_detail(exc)
    if drift:
        logger.error(f"Schema drift on {request.method} {request.url.path}: {exc}")
        return JSONResponse(status_code=503, content={"detail": drift, "type": "schema_drift"})
    tb = traceback.format_exc()
    logger.error(f"Unhandled exception on {request.method} {request.url.path}:\n{tb}")
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc), "type": type(exc).__name__},
    )

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "backend", "db_mode": "supabase_sdk"}

@app.on_event("startup")
async def on_startup():
    logger.info(f"WEDY RH Platform started (SDK Mode)")
    logger.info(f"   URL: {settings.SUPABASE_URL}")
