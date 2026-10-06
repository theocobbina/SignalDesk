"""Find requests that describe the same problem."""

from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import Request, RequestStatus

# Requests in these states are still being worked on, so a new report is likely a duplicate.
OPEN_STATUSES = [RequestStatus.new, RequestStatus.needs_review, RequestStatus.triaged, RequestStatus.in_progress]


def find_similar(
    db: Session,
    embedding: list[float],
    *,
    building_id: int | None = None,
    exclude_id: int | None = None,
    open_only: bool = False,
    days: int = 30,
    limit: int = 5,
) -> list[tuple[Request, float]]:
    """Return (request, similarity) pairs above the threshold, most similar first."""
    distance = Request.embedding.cosine_distance(embedding)
    stmt = (
        select(Request, (1 - distance).label("similarity"))
        .where(Request.embedding.is_not(None))
        .where(Request.duplicate_of.is_(None))  # point at the original, not its duplicates
        .where(Request.created_at >= datetime.now(timezone.utc) - timedelta(days=days))
        .where(distance <= 1 - get_settings().similarity_threshold)
        .order_by(distance)
        .limit(limit)
    )
    if building_id is not None:
        stmt = stmt.where(Request.building_id == building_id)
    if exclude_id is not None:
        stmt = stmt.where(Request.id != exclude_id)
    if open_only:
        stmt = stmt.where(Request.status.in_(OPEN_STATUSES))
    return [(req, float(sim)) for req, sim in db.execute(stmt).unique().all()]
