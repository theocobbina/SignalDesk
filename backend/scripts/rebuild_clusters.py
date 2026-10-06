"""Recompute all emerging-issue clusters from scratch, replaying requests in order.

Usage (from backend/):  .venv/bin/python -m scripts.rebuild_clusters
Run this after changing the CLUSTER_* settings.
"""

from sqlalchemy import delete, select, update

from app.db import SessionLocal
from app.models import IssueCluster, Request
from app.services.clusters import assign_to_cluster

with SessionLocal() as db:
    db.execute(update(Request).values(cluster_id=None))
    db.execute(delete(IssueCluster))
    db.commit()

    for req in db.scalars(select(Request).order_by(Request.created_at)).unique().all():
        assign_to_cluster(db, req)

    clusters = db.scalars(select(IssueCluster)).unique().all()
    print(f"Built {len(clusters)} cluster(s)")
    for c in clusters:
        print(f"  #{c.id} {c.title!r}: {c.request_count} reports")
