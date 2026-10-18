"""The signed-in user's profile, and admin user management."""

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.auth import admin_user, current_user
from app.db import get_db
from app.models import Building, Profile, Team, UserRole
from app.schemas import ProfileOut, ProfileUpdate, UserOut, UserUpdate

router = APIRouter(tags=["users"])

# Emails live in Supabase's auth.users table, not in profiles.
USERS_SQL = """
    select p.id, u.email, p.full_name, p.role, p.team_id, p.building_id, p.room, p.created_at
    from profiles p
    join auth.users u on u.id = p.id
"""


def _profile_out(db: Session, user: Profile) -> ProfileOut:
    out = ProfileOut.model_validate(user)
    out.email = db.execute(text("select email from auth.users where id = :id"), {"id": user.id}).scalar()
    return out


@router.get("/me", response_model=ProfileOut)
def get_me(user: Profile = Depends(current_user), db: Session = Depends(get_db)):
    return _profile_out(db, user)


@router.patch("/me", response_model=ProfileOut)
def update_me(body: ProfileUpdate, user: Profile = Depends(current_user), db: Session = Depends(get_db)):
    changes = body.model_dump(exclude_unset=True)
    if changes.get("building_id") is not None and db.get(Building, changes["building_id"]) is None:
        raise HTTPException(422, "Unknown building")
    for field, value in changes.items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return _profile_out(db, user)


@router.get("/users", response_model=list[UserOut])
def list_users(_: Profile = Depends(admin_user), db: Session = Depends(get_db)):
    return [dict(r) for r in db.execute(text(USERS_SQL + " order by p.created_at")).mappings()]


@router.patch("/users/{user_id}", response_model=UserOut)
def update_user(
    user_id: uuid.UUID,
    body: UserUpdate,
    admin: Profile = Depends(admin_user),
    db: Session = Depends(get_db),
):
    target = db.get(Profile, user_id)
    if target is None:
        raise HTTPException(404, "User not found")
    changes = body.model_dump(exclude_unset=True)
    if target.id == admin.id and changes.get("role", UserRole.admin) != UserRole.admin:
        raise HTTPException(422, "You can't remove your own admin role")
    if changes.get("team_id") is not None and db.get(Team, changes["team_id"]) is None:
        raise HTTPException(422, "Unknown team")
    for field, value in changes.items():
        setattr(target, field, value)
    db.commit()
    return dict(db.execute(text(USERS_SQL + " where p.id = :id"), {"id": user_id}).mappings().one())
