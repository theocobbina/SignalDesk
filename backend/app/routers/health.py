from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import get_db

router = APIRouter(tags=["health"])


@router.get("/health")
def health(db: Session = Depends(get_db)) -> dict:
    db.execute(text("select 1"))
    return {
        "status": "ok",
        "database": "ok",
        "jev_key_configured": bool(get_settings().openrouter_api_key),
    }
