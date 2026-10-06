"""Submitting and managing dorm issue requests."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Assignment, Building, Category, Request, RequestStatus, StatusHistory, Team
from app.schemas import RequestCreate, RequestDetail, RequestOut, RequestUpdate, SimilarQuery, SimilarRequest
from app.services.clusters import assign_to_cluster
from app.services.embeddings import embed, request_text
from app.services.similarity import find_similar
from app.services.triage import triage

router = APIRouter(prefix="/requests", tags=["requests"])

CLOSED_STATUSES = {RequestStatus.resolved, RequestStatus.closed, RequestStatus.rejected}


def _get_or_404(db: Session, request_id: int) -> Request:
    req = db.get(Request, request_id)
    if req is None:
        raise HTTPException(404, "Request not found")
    return req


@router.post("", response_model=RequestDetail, status_code=201)
def create_request(body: RequestCreate, db: Session = Depends(get_db)):
    if db.get(Building, body.building_id) is None:
        raise HTTPException(422, "Unknown building")

    req = Request(
        **body.model_dump(),
        status=RequestStatus.new,
        embedding=embed(request_text(body.title, body.description)),
    )
    db.add(req)
    db.flush()
    db.add(StatusHistory(request_id=req.id, to_status=RequestStatus.new, note="Submitted"))
    db.commit()
    db.refresh(req)

    # The request is already saved; if Jev fails it just stays "new".
    triage(db, req)
    # After triage, so the cluster knows the category and priority.
    assign_to_cluster(db, req)
    return req


@router.post("/similar", response_model=list[SimilarRequest])
def similar_to_draft(body: SimilarQuery, db: Session = Depends(get_db)):
    """Open requests similar to a report the student is still typing."""
    matches = find_similar(
        db,
        embed(request_text(body.title, body.description)),
        building_id=body.building_id,
        open_only=True,
        limit=3,
    )
    return [SimilarRequest(request=RequestOut.model_validate(r), similarity=s) for r, s in matches]


@router.get("", response_model=list[RequestOut])
def list_requests(
    status: RequestStatus | None = None,
    building_id: int | None = None,
    category: str | None = None,
    team_id: int | None = None,
    q: str | None = Query(default=None, description="Search title and description"),
    limit: int = Query(default=50, le=200),
    offset: int = 0,
    db: Session = Depends(get_db),
):
    stmt = select(Request)
    if status:
        stmt = stmt.where(Request.status == status)
    if building_id:
        stmt = stmt.where(Request.building_id == building_id)
    if category:
        stmt = stmt.where(Request.category_slug == category)
    if team_id:
        stmt = stmt.where(Request.team_id == team_id)
    if q:
        pattern = f"%{q}%"
        stmt = stmt.where(Request.title.ilike(pattern) | Request.description.ilike(pattern))

    # Most urgent first, then newest.
    stmt = stmt.order_by(Request.priority.desc().nulls_last(), Request.created_at.desc())
    return db.scalars(stmt.limit(limit).offset(offset)).unique().all()


@router.get("/{request_id}", response_model=RequestDetail)
def get_request(request_id: int, db: Session = Depends(get_db)):
    return _get_or_404(db, request_id)


@router.get("/{request_id}/similar", response_model=list[SimilarRequest])
def similar_to_request(request_id: int, db: Session = Depends(get_db)):
    """Possible duplicates of an existing request, in the same building."""
    req = _get_or_404(db, request_id)
    if req.embedding is None:
        return []
    matches = find_similar(db, [float(x) for x in req.embedding], building_id=req.building_id, exclude_id=req.id)
    return [SimilarRequest(request=RequestOut.model_validate(r), similarity=s) for r, s in matches]


@router.post("/{request_id}/triage", response_model=RequestDetail)
def retriage_request(request_id: int, db: Session = Depends(get_db)):
    """Run Jev again, e.g. after it was down or the description changed."""
    req = _get_or_404(db, request_id)
    if triage(db, req) is None:
        raise HTTPException(503, "AI triage is unavailable, try again later")
    return req


@router.patch("/{request_id}", response_model=RequestDetail)
def update_request(request_id: int, body: RequestUpdate, db: Session = Depends(get_db)):
    req = _get_or_404(db, request_id)
    changes = body.model_dump(exclude_unset=True)
    note = changes.pop("note", None)

    if "category_slug" in changes and changes["category_slug"] is not None:
        if db.get(Category, changes["category_slug"]) is None:
            raise HTTPException(422, "Unknown category")
    if changes.get("duplicate_of") is not None:
        original = db.get(Request, changes["duplicate_of"])
        if original is None or original.id == req.id:
            raise HTTPException(422, "Invalid duplicate_of request")
        if original.duplicate_of is not None:
            changes["duplicate_of"] = original.duplicate_of  # always point at the root request
    if "team_id" in changes and changes["team_id"] is not None:
        if db.get(Team, changes["team_id"]) is None:
            raise HTTPException(422, "Unknown team")
        if changes["team_id"] != req.team_id:
            for a in db.scalars(select(Assignment).where(Assignment.request_id == req.id, Assignment.active)):
                a.active = False
            db.add(Assignment(request_id=req.id, team_id=changes["team_id"]))

    new_status = changes.pop("status", None)
    for field, value in changes.items():
        setattr(req, field, value)

    if new_status is not None and new_status != req.status:
        db.add(StatusHistory(request_id=req.id, from_status=req.status, to_status=new_status, note=note))
        req.status = new_status
        req.resolved_at = datetime.now(timezone.utc) if new_status in CLOSED_STATUSES else None
    elif note:
        # A comment without a status change still goes on the timeline.
        db.add(StatusHistory(request_id=req.id, from_status=req.status, to_status=req.status, note=note))

    db.commit()
    db.refresh(req)
    return req
