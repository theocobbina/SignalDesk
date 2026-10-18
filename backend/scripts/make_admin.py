"""Give an existing user the admin role (use once, to create the first admin).

Usage (from backend/):  .venv/bin/python -m scripts.make_admin you@example.com
The user must have signed up in the app first.
"""

import sys

from sqlalchemy import text

from app.db import SessionLocal

if len(sys.argv) != 2:
    sys.exit(__doc__)

with SessionLocal() as db:
    updated = db.execute(
        text("update profiles set role = 'admin' where id = (select id from auth.users where email = :email)"),
        {"email": sys.argv[1].strip().lower()},
    ).rowcount
    db.commit()
    print("Done: user is now an admin." if updated else "No user with that email. Sign up in the app first.")
