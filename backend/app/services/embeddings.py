"""Sentence embeddings for finding similar requests.

all-MiniLM-L6-v2 is a small pretrained model (384 dims, ~90 MB) that runs on CPU.
Two texts with similar meaning get vectors with high cosine similarity,
even when they share few words ("no hot water" vs "showers are freezing").
"""

import logging
import threading

from sentence_transformers import SentenceTransformer

log = logging.getLogger(__name__)

MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"

_model: SentenceTransformer | None = None
_lock = threading.Lock()


def get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        with _lock:
            if _model is None:
                log.info("Loading embedding model %s", MODEL_NAME)
                _model = SentenceTransformer(MODEL_NAME)
    return _model


def request_text(title: str, description: str) -> str:
    return f"{title}. {description}"


def embed(text: str) -> list[float]:
    # Normalized vectors: cosine similarity == dot product.
    return get_model().encode(text, normalize_embeddings=True).tolist()
