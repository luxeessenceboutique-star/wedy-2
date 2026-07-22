from app.routers.auth import router as auth_router
from app.routers.profiles import router as profiles_router
from app.routers.employees import router as employees_router
from app.routers.interns import router as interns_router
from app.routers.documents import router as documents_router
from app.routers.cv import router as cv_router
from app.routers.requests import router as requests_router
from app.routers.departments import router as departments_router
from app.routers.notifications import router as notifications_router
from app.routers.dashboard import router as dashboard_router

__all__ = [
    "auth_router",
    "profiles_router",
    "employees_router",
    "interns_router",
    "documents_router",
    "cv_router",
    "requests_router",
    "departments_router",
    "notifications_router",
    "dashboard_router",
]
