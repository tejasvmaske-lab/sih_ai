import os
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.config import BASE_DIR, OPENAI_API_KEY
from app.routers import grievances, dashboard, officer, voice, auth

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AI Citizen Grievance Platform",
    description="AI-Based Grievance Classification, Prioritization, Duplicate Detection & Smart Routing",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static & Templates setup
static_path = BASE_DIR / "static"
templates_path = BASE_DIR / "templates"

static_path.mkdir(parents=True, exist_ok=True)
templates_path.mkdir(parents=True, exist_ok=True)

app.mount("/static", StaticFiles(directory=str(static_path)), name="static")
templates = Jinja2Templates(directory=str(templates_path))

# Include routers
app.include_router(auth.router)
app.include_router(grievances.router)
app.include_router(dashboard.router)
app.include_router(officer.router)
app.include_router(voice.router)


@app.get("/")
def read_root(request: Request):
    """Renders main portal template."""
    return templates.TemplateResponse(
        request=request,
        name="index.html",
        context={"voice_enabled": bool(OPENAI_API_KEY)}
    )

@app.get("/login")
def citizen_login_page(request: Request):
    """Dedicated Citizen Login & Registration page."""
    return templates.TemplateResponse(
        request=request,
        name="login.html",
        context={}
    )

@app.get("/admin/login")
def admin_login_page(request: Request):
    """Dedicated Municipal Corporation Admin Login page — strictly isolated from citizens."""
    return templates.TemplateResponse(
        request=request,
        name="admin_login.html",
        context={}
    )

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "system": "AI Citizen Grievance Platform",
        "voice_configured": bool(OPENAI_API_KEY),
        "login_urls": {
            "citizen": "/login",
            "admin": "/admin/login"
        }
    }
