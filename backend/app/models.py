"""SQLAlchemy models mapped onto the tables created in supabase/migrations."""

import enum
import uuid
from datetime import datetime

from pgvector.sqlalchemy import Vector
from sqlalchemy import BigInteger, ForeignKey, SmallInteger, Text, func
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class RequestStatus(str, enum.Enum):
    new = "new"
    needs_review = "needs_review"
    triaged = "triaged"
    in_progress = "in_progress"
    resolved = "resolved"
    closed = "closed"
    rejected = "rejected"


# The type already exists in Postgres; never let SQLAlchemy try to create it.
status_enum = SAEnum(RequestStatus, name="request_status", create_type=False)


class Team(Base):
    __tablename__ = "teams"

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str]
    name: Mapped[str]
    description: Mapped[str | None]


class Building(Base):
    __tablename__ = "buildings"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str]
    name: Mapped[str]


class Category(Base):
    __tablename__ = "categories"

    slug: Mapped[str] = mapped_column(Text, primary_key=True)
    name: Mapped[str]
    description: Mapped[str]
    default_team_id: Mapped[int | None] = mapped_column(ForeignKey("teams.id"))


class Request(Base):
    __tablename__ = "requests"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    reporter_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    building_id: Mapped[int | None] = mapped_column(ForeignKey("buildings.id"))
    room: Mapped[str | None]
    title: Mapped[str]
    description: Mapped[str]

    category_slug: Mapped[str | None] = mapped_column(ForeignKey("categories.slug"))
    priority: Mapped[int | None] = mapped_column(SmallInteger)
    safety_hazard: Mapped[bool] = mapped_column(default=False)
    team_id: Mapped[int | None] = mapped_column(ForeignKey("teams.id"))
    status: Mapped[RequestStatus] = mapped_column(status_enum, default=RequestStatus.new)

    embedding = mapped_column(Vector(384), nullable=True)
    duplicate_of: Mapped[int | None] = mapped_column(ForeignKey("requests.id"))

    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now())
    resolved_at: Mapped[datetime | None]

    building: Mapped[Building | None] = relationship(lazy="joined")
    category: Mapped[Category | None] = relationship(lazy="joined")
    team: Mapped[Team | None] = relationship(lazy="joined")
    history: Mapped[list["StatusHistory"]] = relationship(
        order_by="StatusHistory.created_at", lazy="selectin"
    )
    predictions: Mapped[list["Prediction"]] = relationship(
        order_by="Prediction.created_at.desc()", lazy="selectin"
    )


class StatusHistory(Base):
    __tablename__ = "status_history"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    request_id: Mapped[int] = mapped_column(ForeignKey("requests.id"))
    from_status: Mapped[RequestStatus | None] = mapped_column(status_enum)
    to_status: Mapped[RequestStatus] = mapped_column(status_enum)
    changed_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    note: Mapped[str | None]
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())


class Assignment(Base):
    __tablename__ = "assignments"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    request_id: Mapped[int] = mapped_column(ForeignKey("requests.id"))
    team_id: Mapped[int | None] = mapped_column(ForeignKey("teams.id"))
    assignee_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    assigned_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())


class Prediction(Base):
    __tablename__ = "predictions"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    request_id: Mapped[int] = mapped_column(ForeignKey("requests.id"))
    model: Mapped[str]
    category_slug: Mapped[str | None]
    category_confidence: Mapped[float | None]
    category_probs: Mapped[dict | None] = mapped_column(JSONB)
    priority_score: Mapped[float | None]
    priority_confidence: Mapped[float | None]
    priority_probs: Mapped[dict | None] = mapped_column(JSONB)
    safety_hazard_prob: Mapped[float | None]
    cost_usd: Mapped[float | None]
    latency_ms: Mapped[int | None]
    raw: Mapped[dict | None] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
