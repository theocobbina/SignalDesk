"""Compute embeddings for requests created before similarity search existed.

Usage (from backend/):  .venv/bin/python -m scripts.backfill_embeddings
"""

from sqlalchemy import select

from app.db import SessionLocal
from app.models import Request
from app.services.embeddings import embed, request_text

with SessionLocal() as db:
    missing = db.scalars(select(Request).where(Request.embedding.is_(None))).unique().all()
    for req in missing:
        req.embedding = embed(request_text(req.title, req.description))
    db.commit()
    print(f"Embedded {len(missing)} requests")
