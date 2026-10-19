import threading
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.routers import clusters, health, reference, requests, stats, users
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
app.include_router(stats.router, prefix="/api")
app.include_router(users.router, prefix="/api")

# In production the built React app (frontend/dist) is served by this same server,
# so the site and the API share one address. In development Vite serves it instead.
frontend_dist = get_settings().frontend_dist
if frontend_dist.is_dir():
    app.mount("/assets", StaticFiles(directory=frontend_dist / "assets"), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    def frontend(path: str):
        if path.startswith("api/"):
            raise HTTPException(404, "Not found")
        file = (frontend_dist / path).resolve()
        if path and file.is_file() and file.is_relative_to(frontend_dist):
            return FileResponse(file)
        # Any other path is a page in the React app (e.g. /requests/12).
        return FileResponse(frontend_dist / "index.html")
