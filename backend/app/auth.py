"""Authentication: verify Supabase login tokens and load the caller's profile.

The frontend signs in with Supabase Auth and sends the access token as
`Authorization: Bearer <token>`. Supabase signs tokens with a private key;
we verify them with the project's public keys (JWKS), so no secret is needed.
"""

import ssl
import uuid
from functools import lru_cache

import certifi
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import get_db
from app.models import Profile, UserRole

bearer = HTTPBearer(auto_error=False)


@lru_cache
def _jwks_client() -> jwt.PyJWKClient:
    url = f"{get_settings().supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"
    # Use certifi's CA bundle: python.org builds of Python on macOS don't trust the system certificates.
    ssl_context = ssl.create_default_context(cafile=certifi.where())
    return jwt.PyJWKClient(url, cache_keys=True, lifespan=3600, ssl_context=ssl_context)


def _unauthorized(detail: str) -> HTTPException:
    return HTTPException(status.HTTP_401_UNAUTHORIZED, detail, headers={"WWW-Authenticate": "Bearer"})


def verify_token(token: str) -> dict:
    try:
        key = _jwks_client().get_signing_key_from_jwt(token)
        return jwt.decode(
            token,
            key.key,
            algorithms=["ES256", "RS256"],
            audience="authenticated",
            issuer=f"{get_settings().supabase_url.rstrip('/')}/auth/v1",
        )
    except jwt.PyJWTError as e:
        raise _unauthorized(f"Invalid or expired login: {e}") from e


def current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> Profile:
    """The signed-in user's profile. 401 if not signed in."""
    if creds is None:
        raise _unauthorized("Please sign in")
    claims = verify_token(creds.credentials)
    profile = db.get(Profile, uuid.UUID(claims["sub"]))
    if profile is None:
        # The signup trigger normally creates this; recover if it didn't.
        profile = Profile(id=uuid.UUID(claims["sub"]), full_name=(claims.get("user_metadata") or {}).get("full_name"))
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


def staff_user(user: Profile = Depends(current_user)) -> Profile:
    if not user.is_staff:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Staff only")
    return user


def admin_user(user: Profile = Depends(current_user)) -> Profile:
    if user.role != UserRole.admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Admins only")
    return user
