"""Main entry point for YODABOT RH Platform v2.0 (Supabase SDK Version)"""
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from loguru import logger
import os

from app.config import settings
from app.routers import (
    auth, profiles, employees, interns,
    documents, cv, requests, departments,
    notifications, dashboard
)
from app.dependencies import get_current_user

app = FastAPI(
    title=settings.APP_NAME,
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
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

# Protected Uploads Endpoint
@app.get("/api/uploads/{file_path:path}")
async def get_protected_upload(
    file_path: str,
    current_user: dict = Depends(get_current_user)
):
    """Serve files only to authenticated users"""
    full_path = os.path.join(settings.UPLOAD_DIR, file_path)
    if not os.path.exists(full_path):
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Fichier non trouvé")
    return FileResponse(full_path)

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "backend", "db_mode": "supabase_sdk"}

@app.on_event("startup")
async def on_startup():
    logger.info(f"YODABOT RH Platform started (SDK Mode)")
    logger.info(f"   URL: {settings.SUPABASE_URL}")
