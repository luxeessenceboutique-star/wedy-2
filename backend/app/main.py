from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import auth, employees, templates, documents

app = FastAPI(
    title="YODABOT RH API",
    description="Automatic HR document generation API for TYTHON — powered by Claude AI",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(employees.router, prefix="/api")
app.include_router(templates.router, prefix="/api")
app.include_router(documents.router, prefix="/api")


@app.get("/")
async def root():
    return {"service": "YODABOT RH API", "status": "running", "version": "1.0.0"}


@app.get("/health")
async def health():
    return {"status": "ok"}
