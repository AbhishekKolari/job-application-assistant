from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import auth, dashboard, jobs, tailoring, resumes
from app.core.config import get_settings
from app.db.session import init_db


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title=settings.PROJECT_NAME)

    if settings.FRONTEND_ORIGINS:
        allowed_origins = [str(origin).rstrip("/") for origin in settings.FRONTEND_ORIGINS]
        app.add_middleware(
            CORSMiddleware,
            allow_origins=allowed_origins,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    app.include_router(auth.router, prefix=settings.API_V1_PREFIX)
    app.include_router(resumes.router, prefix=settings.API_V1_PREFIX)
    app.include_router(jobs.router, prefix=settings.API_V1_PREFIX)
    app.include_router(tailoring.router, prefix=settings.API_V1_PREFIX)
    app.include_router(dashboard.router, prefix=settings.API_V1_PREFIX)

    @app.on_event("startup")
    async def on_startup() -> None:
        settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        await init_db()

    return app


app = create_app()
