"""Detect emerging issues: bursts of similar reports from the same building.

Runs incrementally each time a request is created:
  1. If the request matches an active cluster in its building, it joins that cluster.
  2. Otherwise, if enough unclustered similar reports arrived recently in the
     same building, they form a new cluster together.
"""

from collections import Counter
from datetime import datetime, timedelta, timezone

import numpy as np
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import ClusterStatus, IssueCluster, Request, RequestStatus, StatusHistory
from app.services.similarity import OPEN_STATUSES


def _vec(embedding) -> list[float]:
    return [float(x) for x in embedding]


def _refresh_stats(cluster: IssueCluster, members: list[Request]) -> None:
    vectors = np.array([_vec(r.embedding) for r in members])
    centroid = vectors.mean(axis=0)
    cluster.centroid = (centroid / np.linalg.norm(centroid)).tolist()
    cluster.request_count = len(members)
    cluster.first_seen = min(r.created_at for r in members)
    cluster.last_seen = max(r.created_at for r in members)
    priorities = [r.priority for r in members if r.priority is not None]
    cluster.max_priority = max(priorities) if priorities else None
    categories = Counter(r.category_slug for r in members if r.category_slug)
    cluster.category_slug = categories.most_common(1)[0][0] if categories else None


def _link(db: Session, req: Request, cluster: IssueCluster) -> None:
    req.cluster_id = cluster.id
    db.add(
        StatusHistory(
            request_id=req.id,
            from_status=req.status,
            to_status=req.status,
            note=f"Linked to emerging issue #{cluster.id}: {cluster.title}",
        )
    )


def assign_to_cluster(db: Session, req: Request) -> IssueCluster | None:
    """Attach `req` to an existing cluster or start a new one. Commits."""
    settings = get_settings()
    if req.embedding is None or req.building_id is None or req.cluster_id is not None:
        return None

    embedding = _vec(req.embedding)
    max_distance = 1 - settings.cluster_similarity_threshold
    window_start = req.created_at - timedelta(hours=settings.cluster_window_hours)

    # 1. Join the closest active cluster in this building.
    distance = IssueCluster.centroid.cosine_distance(embedding)
    cluster = db.scalars(
        select(IssueCluster)
        .where(IssueCluster.status == ClusterStatus.active)
        .where(IssueCluster.building_id == req.building_id)
        .where(IssueCluster.last_seen >= window_start)
        .where(distance <= max_distance)
        .order_by(distance)
        .limit(1)
    ).first()
    if cluster is not None:
        _link(db, req, cluster)
        db.flush()
        _refresh_stats(cluster, [*cluster.requests, req] if req not in cluster.requests else cluster.requests)
        db.commit()
        return cluster

    # 2. Enough recent unclustered look-alikes? Start a new cluster.
    distance = Request.embedding.cosine_distance(embedding)
    peers = db.scalars(
        select(Request)
        .where(Request.building_id == req.building_id)
        .where(Request.id != req.id)
        .where(Request.cluster_id.is_(None))
        .where(Request.embedding.is_not(None))
        .where(Request.status != RequestStatus.rejected)
        .where(Request.created_at.between(window_start, req.created_at))
        .where(distance <= max_distance)
    ).unique().all()
    if len(peers) + 1 < settings.cluster_min_size:
        return None

    members = sorted([*peers, req], key=lambda r: r.created_at)
    cluster = IssueCluster(
        building_id=req.building_id,
        title=members[0].title,
        status=ClusterStatus.active,
        first_seen=members[0].created_at,
        last_seen=members[-1].created_at,
    )
    _refresh_stats(cluster, members)
    db.add(cluster)
    db.flush()
    for member in members:
        _link(db, member, cluster)
    db.commit()
    db.refresh(cluster)
    return cluster


def resolve_cluster(
    db: Session, cluster: IssueCluster, status: ClusterStatus, note: str | None, resolve_requests: bool
) -> IssueCluster:
    """Close a cluster, optionally resolving every open report in it at once."""
    now = datetime.now(timezone.utc)
    cluster.status = status
    cluster.resolved_at = now
    cluster.resolution_note = note

    if resolve_requests and status == ClusterStatus.resolved:
        for req in cluster.requests:
            if req.status in OPEN_STATUSES:
                db.add(
                    StatusHistory(
                        request_id=req.id,
                        from_status=req.status,
                        to_status=RequestStatus.resolved,
                        note=f"Resolved with emerging issue #{cluster.id}" + (f": {note}" if note else ""),
                    )
                )
                req.status = RequestStatus.resolved
                req.resolved_at = now

    db.commit()
    db.refresh(cluster)
    return cluster
