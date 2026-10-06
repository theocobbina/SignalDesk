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
Fill in `backend/.env` (`OPENROUTER_API_KEY`, `DATABASE_URL`), then:
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

## Roadmap
1. ✅ Foundation: project structure, schema, Jev client
2. ✅ Core app: submit and manage requests
3. ✅ Jev triage + human review queue for low-confidence predictions
4. ✅ Similar-issue detection (SentenceTransformers + pgvector)
5. ✅ Emerging-issue alerts
6. Dashboard
7. Auth and roles
