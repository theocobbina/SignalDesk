import threading
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import clusters, health, reference, requests
from app.services.embeddings import get_model


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load the embedding model in the background so the first report isn't slow.
    threading.Thread(target=get_model, daemon=True).start()
    yield


app = FastAPI(title="SignalDesk API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[get_settings().frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api")
app.include_router(reference.router, prefix="/api")
app.include_router(requests.router, prefix="/api")
app.include_router(clusters.router, prefix="/api")
