# SignalDesk

Dormitory issue reporting with AI triage. Students report problems, **Jev** (TypeSafe's decision model, via OpenRouter) assigns a category, priority and safety flag, and the request is routed to the right team.

| Part | Tech |
|---|---|
| Backend | Python, FastAPI, SQLAlchemy |
| Database / Auth | Supabase (PostgreSQL + pgvector) |
| AI triage | Jev (`typesafe-sdk` → OpenRouter) |
| Frontend | React + Vite + Tailwind (Node.js) |

## Setup

### 1. Supabase
1. Create a project at https://supabase.com.
2. **SQL Editor** → paste and run `supabase/migrations/0001_init.sql`, then the other files in `supabase/migrations/` in order, then `supabase/seed.sql`.

### 2. Backend
Fill in `backend/.env` (`OPENROUTER_API_KEY`, `DATABASE_URL`, `SUPABASE_URL`), then:
```bash
cd backend
.venv/bin/python -m scripts.try_jev          # test Jev
.venv/bin/uvicorn app.main:app --reload      # http://localhost:8000/docs
```

### 3. Frontend
Fill in `frontend/.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`), then:
```bash
cd frontend
npm run dev                                  # http://localhost:5173
```

### 4. First admin
In Supabase → **Authentication → URL Configuration**, set **Site URL** to `http://localhost:5173`.
Sign up in the app, confirm your email, then make yourself an admin:
```bash
cd backend
.venv/bin/python -m scripts.make_admin you@example.com
```
Admins can promote other users to **staff** from the Users page.

## Deploy (Render)
The app deploys as one Docker service: FastAPI serves the API and the built React app.
1. On [Render](https://render.com), **New → Blueprint**, pick this repo (uses `render.yaml`).
2. Fill in the secrets it asks for: `OPENROUTER_API_KEY` and `DATABASE_URL` (Supabase session pooler string).
3. In Supabase → **Authentication → URL Configuration**, add the Render URL (e.g. `https://signaldesk.onrender.com`) as the Site URL and a Redirect URL.

The free plan sleeps after ~15 minutes idle; the first visit after that takes ~30–60 s.

## Roles
| Role | Can do |
|---|---|
| Student | Report issues, see only their own reports and progress |
| Staff | See and manage all requests, dashboard, emerging issues |
| Admin | Everything staff can do, plus manage user roles and teams |

## Roadmap
1. ✅ Foundation: project structure, schema, Jev client
2. ✅ Core app: submit and manage requests
3. ✅ Jev triage + human review queue for low-confidence predictions
4. ✅ Similar-issue detection (all-MiniLM-L6-v2 via fastembed + pgvector)
5. ✅ Emerging-issue alerts
6. ✅ Dashboard
7. ✅ Auth and roles
