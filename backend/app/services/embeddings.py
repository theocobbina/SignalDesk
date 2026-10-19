"""Sentence embeddings for finding similar requests.

all-MiniLM-L6-v2 is a small pretrained model (384 dims) that runs on CPU.
Two texts with similar meaning get vectors with high cosine similarity,
even when they share few words ("no hot water" vs "showers are freezing").

It runs through fastembed (ONNX Runtime) rather than PyTorch, which gives the
same vectors with a fraction of the memory, so the backend fits on small hosts.
"""

import logging
import os
import threading

import numpy as np
from fastembed import TextEmbedding

log = logging.getLogger(__name__)

MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
# Where the model files are cached; the Docker image downloads them at build time.
CACHE_DIR = os.environ.get("FASTEMBED_CACHE_PATH")

_model: TextEmbedding | None = None
_lock = threading.Lock()


def get_model() -> TextEmbedding:
    global _model
    if _model is None:
        with _lock:
            if _model is None:
                log.info("Loading embedding model %s", MODEL_NAME)
                _model = TextEmbedding(MODEL_NAME, cache_dir=CACHE_DIR)
    return _model


def request_text(title: str, description: str) -> str:
    return f"{title}. {description}"


def embed(text: str) -> list[float]:
    vector = next(iter(get_model().embed([text])))
    # Normalized vectors: cosine similarity == dot product.
    return (vector / np.linalg.norm(vector)).tolist()
