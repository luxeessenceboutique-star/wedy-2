"""Run this to see exactly what is broken: python check.py"""
import sys
print(f"Python: {sys.version}")
print(f"Path: {sys.executable}\n")

tests = [
    ("fastapi",           "from fastapi import FastAPI"),
    ("uvicorn",           "import uvicorn"),
    ("pydantic",          "from pydantic import BaseModel"),
    ("pydantic-settings", "from pydantic_settings import BaseSettings"),
    ("supabase",          "from supabase import create_client"),
    ("anthropic",         "import anthropic"),
    ("openai",            "import openai"),
    ("httpx",             "import httpx"),
    ("loguru",            "from loguru import logger"),
    ("python-multipart",  "import multipart"),
    ("pymupdf (fitz)",    "import fitz"),
    ("python-docx",       "from docx import Document"),
    ("reportlab",         "from reportlab.lib.pagesizes import A4"),
    ("passlib",           "from passlib.context import CryptContext"),
    ("python-jose",       "from jose import jwt"),
    ("app.config",        "from app.config import settings"),
    ("app.database",      "from app.database import get_db"),
    ("app.dependencies",  "from app.dependencies import get_current_user"),
    ("router: auth",      "from app.routers import auth"),
    ("router: employees", "from app.routers import employees"),
    ("router: templates", "from app.routers import templates"),
    ("router: documents", "from app.routers import documents"),
    ("router: payroll",   "from app.routers import payroll"),
    ("router: generate",  "from app.routers import generate"),
    ("router: interns",   "from app.routers import interns"),
    ("router: profiles",  "from app.routers import profiles"),
    ("router: leaves",    "from app.routers import leaves"),
    ("router: dashboard", "from app.routers import dashboard"),
    ("router: copilot",   "from app.routers import copilot"),
    ("router: analytics", "from app.routers import analytics"),
    ("router: smartdb",   "from app.routers import smartdb"),
    ("router: webhooks",  "from app.routers import webhooks"),
    ("app.main",          "from app.main import app"),
]

ok = 0
fail = 0
for name, stmt in tests:
    try:
        exec(stmt)
        print(f"  OK   {name}")
        ok += 1
    except Exception as e:
        print(f"  FAIL {name}  -->  {e}")
        fail += 1

print(f"\n{ok} OK, {fail} FAILED")
if fail == 0:
    print("All imports work! Start with: python -m uvicorn app.main:app --reload")
else:
    print("Fix the FAIL lines above, then try again.")
