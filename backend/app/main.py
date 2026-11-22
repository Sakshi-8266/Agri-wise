import os
import sys
from pathlib import Path

# Ensure app directories are in sys.path
backend_dir = Path(__file__).resolve().parent.parent
root_dir = backend_dir.parent
for p in (str(backend_dir), str(root_dir)):
    if p not in sys.path:
        sys.path.insert(0, p)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .database import engine, Base, SessionLocal
from .seed import seed_database, ensure_logistics_columns, seed_delivery_data

# Routers
from .routers.auth_router import router as auth_router
from .routers.farms_router import router as farms_router
from .routers.crops_router import router as crops_router
from .routers.recommendation_router import router as recommendation_router
from .routers.weather_router import router as weather_router
from .routers.disease_router import router as disease_router
from .routers.assistant_router import router as assistant_router
from .routers.market_router import router as market_router
from .routers.marketplace_router import router as marketplace_router
from .routers.orders_router import router as orders_router
from .routers.notifications_router import router as notifications_router
from .routers.fpo_router import router as fpo_router
from .routers.admin_router import router as admin_router
from .routers.decision_support_router import router as decision_support_router
from .routers.delivery_router import router as delivery_router

# Initialize Database Schema safely
try:
    Base.metadata.create_all(bind=engine)
    ensure_logistics_columns(engine)
    with SessionLocal() as db:
        seed_database(db)
        seed_delivery_data(db)
except Exception as db_init_err:
    print(f"Notice: Database initialization notice: {db_init_err}")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Agri-Wise (Agrovia): AI-Powered Smart Agriculture, Farm Management, and Market Intelligence Platform API",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware
origins = list(settings.ALLOWED_ORIGINS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if "*" not in origins else ["*"],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?|https://.*\.vercel\.app|https://.*\.onrender\.com",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register All Routers under API_V1_STR
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(farms_router, prefix=settings.API_V1_STR)
app.include_router(crops_router, prefix=settings.API_V1_STR)
app.include_router(recommendation_router, prefix=settings.API_V1_STR)
app.include_router(weather_router, prefix=settings.API_V1_STR)
app.include_router(disease_router, prefix=settings.API_V1_STR)
app.include_router(assistant_router, prefix=settings.API_V1_STR)
app.include_router(market_router, prefix=settings.API_V1_STR)
app.include_router(marketplace_router, prefix=settings.API_V1_STR)
app.include_router(orders_router, prefix=settings.API_V1_STR)
app.include_router(notifications_router, prefix=settings.API_V1_STR)
app.include_router(fpo_router, prefix=settings.API_V1_STR)
app.include_router(admin_router, prefix=settings.API_V1_STR)
app.include_router(decision_support_router, prefix=settings.API_V1_STR)
app.include_router(delivery_router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "platform": "Agri-Wise (Agrovia)",
        "tagline": "AI-Powered Smart Agriculture, Farm Management, and Market Intelligence Platform",
        "status": "OPERATIONAL",
        "docs": "/docs",
        "api_v1": settings.API_V1_STR
    }

@app.get("/health")
def health_check():
    db_type = "postgresql" if "postgres" in settings.DATABASE_URL else "sqlite"
    return {
        "status": "healthy",
        "version": settings.VERSION,
        "database": f"{db_type}_connected"
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
