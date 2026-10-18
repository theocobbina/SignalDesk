"""Pydantic request/response bodies for the API."""

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.models import ClusterStatus, RequestStatus, UserRole


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class TeamOut(ORM):
    id: int
    slug: str
    name: str
    description: str | None


class BuildingOut(ORM):
    id: int
    code: str
    name: str


class CategoryOut(ORM):
    slug: str
    name: str
    description: str
    default_team_id: int | None


class ReporterOut(ORM):
    id: uuid.UUID
    full_name: str | None


class StatusHistoryOut(ORM):
    from_status: RequestStatus | None
    to_status: RequestStatus
    note: str | None
    created_at: datetime


class RequestCreate(BaseModel):
    building_id: int
    room: str | None = Field(default=None, max_length=20)
    title: str = Field(min_length=3, max_length=120)
    description: str = Field(min_length=10, max_length=4000)


class RequestUpdate(BaseModel):
    """Staff edits. Only fields that are sent get changed."""

    status: RequestStatus | None = None
    priority: int | None = Field(default=None, ge=0, le=3)
    category_slug: str | None = None
    team_id: int | None = None
    duplicate_of: int | None = None
    note: str | None = Field(default=None, max_length=1000)


class RequestOut(ORM):
    id: int
    title: str
    description: str
    room: str | None
    status: RequestStatus
    priority: int | None
    safety_hazard: bool
    building: BuildingOut | None
    category: CategoryOut | None
    team: TeamOut | None
    reporter: ReporterOut | None
    duplicate_of: int | None
    cluster_id: int | None
    created_at: datetime
    updated_at: datetime
    resolved_at: datetime | None


class PredictionOut(ORM):
    model: str
    category_slug: str | None
    category_confidence: float | None
    category_probs: dict[str, float] | None
    priority_score: float | None
    priority_confidence: float | None
    priority_probs: dict[str, float] | None
    safety_hazard_prob: float | None
    cost_usd: float | None
    latency_ms: int | None
    created_at: datetime


class RequestDetail(RequestOut):
    history: list[StatusHistoryOut]
    predictions: list[PredictionOut]


class SimilarQuery(BaseModel):
    title: str = ""
    description: str = Field(min_length=10, max_length=4000)
    building_id: int | None = None


class SimilarRequest(BaseModel):
    request: RequestOut
    similarity: float


class ClusterOut(ORM):
    id: int
    title: str
    status: ClusterStatus
    request_count: int
    max_priority: int | None
    building: BuildingOut | None
    category: CategoryOut | None
    first_seen: datetime
    last_seen: datetime
    resolved_at: datetime | None
    resolution_note: str | None


class ClusterDetail(ClusterOut):
    requests: list[RequestOut]


class ClusterResolve(BaseModel):
    status: Literal[ClusterStatus.resolved, ClusterStatus.dismissed] = ClusterStatus.resolved
    note: str | None = Field(default=None, max_length=1000)
    # Also mark every open report in the cluster as resolved.
    resolve_requests: bool = True


class ProfileOut(ORM):
    id: uuid.UUID
    email: str | None = None
    full_name: str | None
    role: UserRole
    building: BuildingOut | None
    room: str | None
    team: TeamOut | None


class ProfileUpdate(BaseModel):
    full_name: str | None = Field(default=None, max_length=100)
    building_id: int | None = None
    room: str | None = Field(default=None, max_length=20)


class UserOut(BaseModel):
    id: uuid.UUID
    email: str | None
    full_name: str | None
    role: UserRole
    team_id: int | None
    building_id: int | None
    room: str | None
    created_at: datetime


class UserUpdate(BaseModel):
    """Admin edits to another user."""

    role: UserRole | None = None
    team_id: int | None = None
