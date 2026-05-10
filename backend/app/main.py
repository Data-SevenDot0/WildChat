from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.routers import (
    users,
    tags,
    translations,
    wildchat_data,
    history_router,
    annotations,
    notes,
    )
import app.models  # Import all models for SQLAlchemy registration
from app.db.database import engine
from app.models.base import Base


# ── App ────────────────────────────────────────────────────────────────────────

app = FastAPI()


@app.on_event("startup")
def create_tables():
    Base.metadata.create_all(bind=engine)

origins = [
    "http://localhost:8001",
    "http://127.0.0.1:8001",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Exception handlers ────────────────────────────────────────────────────────

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": "Resource Error", "detail": exc.detail, "path": request.url.path},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    if errors:
        main_error = errors[0]
        loc = main_error.get("loc", [])
        field_name = loc[-1] if loc else "field"
        message = main_error.get("msg", "is invalid")
        detail = f"Field '{field_name}' {message}"
    else:
        detail = "Validation failed with no specific error details."

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"error": "Validation Failed", "detail": detail, "body": exc.body},
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal Server Error",
            "detail": "An unexpected error occurred in the engine.",
        },
    )


# ── Routers ───────────────────────────────────────────────────────────────────

app.include_router(users.user_router)
app.include_router(tags.tag_router)
app.include_router(translations.translation_router)
app.include_router(wildchat_data.data_router)
app.include_router(annotations.annotation_router)
app.include_router(history_router.history_router)
app.include_router(notes.note_router)