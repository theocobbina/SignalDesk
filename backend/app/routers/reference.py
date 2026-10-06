"""Lookup data for dropdowns: buildings, categories, teams."""

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Building, Category, Team
from app.schemas import BuildingOut, CategoryOut, TeamOut

router = APIRouter(tags=["reference"])


@router.get("/buildings", response_model=list[BuildingOut])
def list_buildings(db: Session = Depends(get_db)):
    return db.scalars(select(Building).order_by(Building.code)).all()


@router.get("/categories", response_model=list[CategoryOut])
def list_categories(db: Session = Depends(get_db)):
    return db.scalars(select(Category).order_by(Category.name)).all()


@router.get("/teams", response_model=list[TeamOut])
def list_teams(db: Session = Depends(get_db)):
    return db.scalars(select(Team).order_by(Team.name)).all()
