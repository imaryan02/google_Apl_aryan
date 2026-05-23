from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import engine, Base
from app.core.config import settings
from app.modules.zones.router import router as zones_router
from app.modules.routes.router import router as routes_router
from app.modules.vip.router import router as vip_router
from app.modules.alerts.router import router as alerts_router
from app.modules.cameras.router import router as cameras_router
from app.modules.ai.router import router as ai_router
from app.modules.dashboard.router import router as dashboard_router
from app.core.seed import seed_db_if_empty

# Initialize database tables
Base.metadata.create_all(bind=engine)
seed_db_if_empty()

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Operational brain of the stadium command center, managing zones, routes, VIP movement, and alerts.",
    version="1.0.0"
)

# Setup up CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.CORS_ORIGINS.split(",") if origin.strip()],
    allow_credentials=settings.CORS_ORIGINS != "*",
    allow_methods=["*"],
    allow_headers=["*"],
)

import socketio
from app.core.socket import sio

# Register routes under API v1 prefix
api_prefix = settings.API_V1_STR

app.include_router(zones_router, prefix=api_prefix)
app.include_router(routes_router, prefix=api_prefix)
app.include_router(vip_router, prefix=api_prefix)
app.include_router(alerts_router, prefix=api_prefix)
app.include_router(cameras_router, prefix=api_prefix)
app.include_router(ai_router, prefix=api_prefix)
app.include_router(dashboard_router, prefix=api_prefix)

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "docs_url": "/docs"
    }

# Wrap the FastAPI application with Socket.IO's ASGI wrapper
app = socketio.ASGIApp(sio, other_asgi_app=app)
