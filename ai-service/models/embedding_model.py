"""
models/embedding_model.py
--------------------------
Loads the SentenceTransformer model ONCE and reuses it for every request.

Why a singleton?
Loading a transformer model from disk takes a second or two. If we loaded
it inside every route handler, every API call would be slow. Instead we
load it a single time (the first time it's needed, or at app startup)
and every route just calls `encode(...)` on the already-loaded model.
"""

from functools import lru_cache
from typing import List, Union

import numpy as np
from sentence_transformers import SentenceTransformer

import config


@lru_cache(maxsize=1)
def get_model() -> SentenceTransformer:
    """
    Returns the shared SentenceTransformer instance.
    `lru_cache(maxsize=1)` guarantees this body only ever runs once —
    every subsequent call just returns the cached object instantly.
    """
    print(f"[embedding_model] Loading model '{config.EMBEDDING_MODEL_NAME}' ...")
    model = SentenceTransformer(config.EMBEDDING_MODEL_NAME)
    print("[embedding_model] Model loaded and ready.")
    return model


def encode(texts: Union[str, List[str]]) -> np.ndarray:
    """
    Encode a single string or a list of strings into embedding vector(s).

    Returns:
        - shape (embedding_dim,)      if `texts` was a single string
        - shape (n_texts, embedding_dim) if `texts` was a list of strings
    """
    model = get_model()
    # normalize_embeddings=True makes the vectors unit length, so a plain
    # dot product between two embeddings IS the cosine similarity — this
    # is what utils/similarity.py relies on.
    return model.encode(texts, normalize_embeddings=True)


def preload():
    """
    Call this once at FastAPI startup so the first real request isn't
    the one that pays the ~1-2s model loading cost.
    """
    get_model()