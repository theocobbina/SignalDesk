"""Emerging issues: clusters of similar reports."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import staff_user
from app.db import get_db
from app.models import ClusterStatus, IssueCluster
from app.schemas import ClusterDetail, ClusterOut, ClusterResolve
from app.services.clusters import resolve_cluster

router = APIRouter(prefix="/clusters", tags=["emerging issues"], dependencies=[Depends(staff_user)])


@router.get("", response_model=list[ClusterOut])
def list_clusters(status: ClusterStatus | None = ClusterStatus.active, db: Session = Depends(get_db)):
    stmt = select(IssueCluster)
    if status:
        stmt = stmt.where(IssueCluster.status == status)
    # Biggest and most urgent first.
    stmt = stmt.order_by(
        IssueCluster.max_priority.desc().nulls_last(),
        IssueCluster.request_count.desc(),
        IssueCluster.last_seen.desc(),
    )
    return db.scalars(stmt).unique().all()


@router.get("/{cluster_id}", response_model=ClusterDetail)
def get_cluster(cluster_id: int, db: Session = Depends(get_db)):
    cluster = db.get(IssueCluster, cluster_id)
    if cluster is None:
        raise HTTPException(404, "Emerging issue not found")
    return cluster


@router.post("/{cluster_id}/resolve", response_model=ClusterDetail)
def resolve(cluster_id: int, body: ClusterResolve, db: Session = Depends(get_db)):
    cluster = db.get(IssueCluster, cluster_id)
    if cluster is None:
        raise HTTPException(404, "Emerging issue not found")
    if cluster.status != ClusterStatus.active:
        raise HTTPException(409, "Emerging issue is already closed")
    return resolve_cluster(db, cluster, body.status, body.note, body.resolve_requests)
