"""Aggregates for the dashboard."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.auth import staff_user
from app.config import get_settings
from app.db import get_db

router = APIRouter(tags=["dashboard"], dependencies=[Depends(staff_user)])

OPEN = "('new', 'needs_review', 'triaged', 'in_progress')"


def _rows(db: Session, sql: str, **params) -> list[dict]:
    return [dict(r) for r in db.execute(text(sql), params).mappings()]


@router.get("/stats")
def stats(days: int = Query(default=30, ge=1, le=365), db: Session = Depends(get_db)) -> dict:
    # Use the database clock (UTC) so day buckets match created_at::date.
    since = db.scalar(text("select current_date - :n"), {"n": days - 1})
    p = {"since": since}

    kpis = _rows(
        db,
        f"""
        select
          count(*) filter (where created_at >= :since)                         as reports,
          count(*) filter (where status in {OPEN})                             as open,
          count(*) filter (where status = 'needs_review')                      as needs_review,
          count(*) filter (where status in {OPEN} and (priority = 3 or safety_hazard)) as urgent_open,
          percentile_cont(0.5) within group (
            order by extract(epoch from resolved_at - created_at) / 3600
          ) filter (where resolved_at >= :since and status = 'resolved')       as median_resolution_hours,
          (select count(*) from issue_clusters where status = 'active')        as active_issues
        from requests
        """,
        **p,
    )[0]

    daily = _rows(
        db,
        """
        select to_char(d, 'YYYY-MM-DD') as date, count(r.id) as count
        from generate_series(:since, current_date, interval '1 day') as d
        left join requests r on r.created_at::date = d::date
        group by d
        order by d
        """,
        **p,
    )

    by_category = _rows(
        db,
        f"""
        select c.slug, c.name, count(r.id) as count, count(r.id) filter (where r.status in {OPEN}) as open
        from categories c
        left join requests r on r.category_slug = c.slug and r.created_at >= :since
        group by c.slug, c.name
        order by count desc, c.name
        """,
        **p,
    )

    by_building = _rows(
        db,
        f"""
        select b.code, b.name, count(r.id) as count, count(r.id) filter (where r.status in {OPEN}) as open
        from buildings b
        left join requests r on r.building_id = b.id and r.created_at >= :since
        group by b.code, b.name
        order by b.code
        """,
        **p,
    )

    open_by_priority = _rows(
        db,
        f"""
        select level as priority, count(r.id) as count
        from generate_series(0, 3) as level
        left join requests r on r.priority = level and r.status in {OPEN}
        group by level
        order by level
        """,
    )

    # Compare what Jev predicted (latest prediction per request) with the request's
    # current values, which staff may have corrected.
    ai = _rows(
        db,
        """
        with latest as (
          select distinct on (request_id) *
          from predictions
          order by request_id, created_at desc
        )
        select
          count(*)                                                            as triaged,
          avg((l.category_confidence >= :threshold)::int)                     as auto_routed_rate,
          avg((l.category_slug = r.category_slug)::int)                       as category_agreement,
          avg(l.latency_ms)                                                   as avg_latency_ms,
          (select coalesce(sum(cost_usd), 0) from predictions where created_at >= :since) as cost_usd
        from latest l
        join requests r on r.id = l.request_id
        where r.created_at >= :since
        """,
        threshold=get_settings().category_confidence_threshold,
        **p,
    )[0]

    return {
        "days": days,
        "kpis": kpis,
        "daily": daily,
        "by_category": by_category,
        "by_building": by_building,
        "open_by_priority": open_by_priority,
        "ai": {k: float(v) if v is not None and k != "triaged" else v for k, v in ai.items()},
    }
