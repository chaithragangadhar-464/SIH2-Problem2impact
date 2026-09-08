"""
utils/similarity.py
--------------------
Cosine-similarity helpers shared by every route.

Because models/embedding_model.py encodes with normalize_embeddings=True,
every vector already has unit length. That means:

    cosine_similarity(a, b) == dot_product(a, b)

...so we can use simple, fast numpy dot products instead of importing
sklearn's heavier cosine_similarity for the single-pair case. We still
use sklearn for the "one vs many" matrix case since it's convenient and
already in requirements.txt.
"""

from typing import List

import numpy as np
from sklearn.metrics.pairwise import cosine_similarity as _sk_cosine_similarity


def similarity_single(vec_a: np.ndarray, vec_b: np.ndarray) -> float:
    """Cosine similarity between two single embedding vectors -> float in [-1, 1]."""
    score = float(np.dot(vec_a, vec_b))
    # Clamp for safety against tiny floating point drift above 1.0 / below -1.0
    return max(-1.0, min(1.0, score))


def similarity_one_to_many(query_vec: np.ndarray, candidate_matrix: np.ndarray) -> List[float]:
    """
    Cosine similarity between one embedding vector and a matrix of many
    candidate embedding vectors. Returns a plain Python list of floats,
    one score per candidate, in the same order as candidate_matrix rows.
    """
    if len(candidate_matrix) == 0:
        return []
    query_2d = query_vec.reshape(1, -1)
    scores = _sk_cosine_similarity(query_2d, candidate_matrix)[0]
    return [float(s) for s in scores]


def to_percentage(score: float) -> float:
    """
    Converts a cosine similarity (-1..1, but realistically ~0..1 for
    normal text) into a friendly 0-100 percentage for the frontend,
    e.g. the "AI Match: 94%" badge. Negative scores are clamped to 0.
    """
    pct = max(0.0, score) * 100
    return round(pct, 1)