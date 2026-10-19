# SignalDesk: one container that serves the React app and the FastAPI backend.

# ---- 1. Build the React frontend ----
FROM node:24-slim AS frontend
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
# Public Supabase settings, baked into the browser bundle at build time.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
RUN npm run build

# ---- 2. Python backend ----
FROM python:3.12-slim
ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    FASTEMBED_CACHE_PATH=/models \
    FRONTEND_DIST=/app/static
WORKDIR /app

COPY backend/requirements.txt ./
RUN pip install -r requirements.txt

# Download the embedding model now, so the server doesn't fetch it on every cold start.
RUN python -c "from fastembed import TextEmbedding; TextEmbedding('sentence-transformers/all-MiniLM-L6-v2', cache_dir='/models')"

COPY backend/ ./
COPY --from=frontend /frontend/dist ./static

# Render provides $PORT.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
