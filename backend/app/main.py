"""Main entry point for WEDY RH Platform v2.0 (Supabase SDK Version)"""
from fastapi import FastAPI, Depends, Request
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
    webhooks, employee_onboarding, training, talents, portal, orgchart
)

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

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
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
