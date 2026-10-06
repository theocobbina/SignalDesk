"""Turn a Jev prediction into routing decisions for a request."""

import logging

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import Assignment, Category, Prediction, Request, RequestStatus, StatusHistory
from app.services.jev import triage_request

log = logging.getLogger(__name__)

PRIORITY_NAMES = ["Low", "Medium", "High", "Emergency"]


def _state(req: Request) -> dict:
    """What Jev sees. Structured state lets it use the location as context."""
    return {
        "title": req.title,
        "description": req.description,
        "building": req.building.name if req.building else None,
        "room": req.room,
    }


def triage(db: Session, req: Request) -> Prediction | None:
    """Classify `req` with Jev, store the prediction and route it.

    Never raises: if Jev is unavailable the request simply stays `new`
    so staff can triage it by hand (or retry later).
    """
    settings = get_settings()
    categories = db.scalars(select(Category)).all()
    try:
        t = triage_request(_state(req), {c.slug: c.description for c in categories})
    except Exception:
        log.exception("Jev triage failed for request %s", req.id)
        return None

    prediction = Prediction(
        request_id=req.id,
        model=t.model,
        category_slug=t.category,
        category_confidence=t.category_confidence,
        category_probs=t.category_probs,
        priority_score=t.priority_score,
        priority_confidence=t.priority_confidence,
        priority_probs=t.priority_probs,
        safety_hazard_prob=t.safety_hazard_prob,
        cost_usd=t.cost_usd,
        latency_ms=t.latency_ms,
        raw=t.raw,
    )
    db.add(prediction)

    # Apply the best guess even when unsure, so the review queue shows a suggestion.
    category = next(c for c in categories if c.slug == t.category)
    safety_hazard = t.safety_hazard_prob >= settings.safety_hazard_threshold
    priority = t.priority
    if safety_hazard:
        priority = max(priority, 2)  # hazards are never below High

    req.category_slug = category.slug
    req.priority = priority
    req.safety_hazard = safety_hazard
    req.team_id = category.default_team_id

    confident = t.category_confidence >= settings.category_confidence_threshold
    new_status = RequestStatus.triaged if confident else RequestStatus.needs_review

    if req.team_id is not None:
        for a in db.scalars(select(Assignment).where(Assignment.request_id == req.id, Assignment.active)):
            a.active = False
        db.add(Assignment(request_id=req.id, team_id=req.team_id))  # assigned_by=None → automatic

    summary = (
        f"Auto-triaged: {category.name} ({t.category_confidence:.0%} confident), "
        f"{PRIORITY_NAMES[priority]} priority"
        + (", safety hazard" if safety_hazard else "")
        + ("" if confident else ". Low confidence, needs human review")
    )
    db.add(StatusHistory(request_id=req.id, from_status=req.status, to_status=new_status, note=summary))
    req.status = new_status

    db.commit()
    db.refresh(req)
    return prediction
