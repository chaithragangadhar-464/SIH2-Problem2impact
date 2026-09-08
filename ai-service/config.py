"""
config.py
---------
Single place to hold every "magic number" and setting the AI service uses.
Nothing here talks to the network or the model — it's pure configuration,
so you can tweak thresholds without hunting through route files.

All values can be overridden with environment variables so you don't have
to edit code to change behaviour between dev / staging / prod.
"""

import os

# ------------------------------------------------------------------
# Server
# ------------------------------------------------------------------
HOST = os.getenv("AI_SERVICE_HOST", "0.0.0.0")
PORT = int(os.getenv("AI_SERVICE_PORT", "8000"))

# ------------------------------------------------------------------
# CORS
# ------------------------------------------------------------------
# NOTE: This AI service is called SERVER-TO-SERVER by the Node/Express
# backend (via axios/fetch from Node, not from a browser), so CORS does
# NOT actually apply to that traffic — CORS is a browser-only mechanism.
# We still enable it, restricted to localhost, purely so you can hit
# these endpoints directly from the FastAPI Swagger UI (/docs) or a
# local test page during development without extra hassle.
CORS_ORIGINS = os.getenv(
    "AI_SERVICE_CORS_ORIGINS",
    "http://localhost:5000,http://localhost:3000"
).split(",")

# ------------------------------------------------------------------
# Embedding model
# ------------------------------------------------------------------
# Small, fast, good-enough-for-a-hackathon sentence embedding model.
# Loaded once at startup (see models/embedding_model.py) and reused
# across every request — loading it per-request would be very slow.
EMBEDDING_MODEL_NAME = os.getenv("AI_EMBEDDING_MODEL", "all-MiniLM-L6-v2")

# ------------------------------------------------------------------
# Thresholds (all cosine similarity scores are in the range 0..1)
# ------------------------------------------------------------------

# routes/extract_skills.py
# A skill from the taxonomy is considered "present" in a text if the
# text's embedding is at least this similar to the skill's embedding.
SKILL_EXTRACTION_THRESHOLD = float(os.getenv("SKILL_EXTRACTION_THRESHOLD", "0.35"))

# routes/validate_solution.py
# Below this similarity between problem <-> solution, the solution is
# flagged as "defective" / low relevance.
MIN_SOLUTION_SIMILARITY = float(os.getenv("MIN_SOLUTION_SIMILARITY", "0.35"))
# Solutions shorter than this many words are auto-flagged as incomplete,
# regardless of similarity score (protects against spammy one-liners).
MIN_SOLUTION_WORD_COUNT = int(os.getenv("MIN_SOLUTION_WORD_COUNT", "15"))

# routes/detect_duplicate.py
# Two problems/solutions with similarity >= this are considered duplicates.
DUPLICATE_SIMILARITY_THRESHOLD = float(os.getenv("DUPLICATE_SIMILARITY_THRESHOLD", "0.85"))

# routes/match_teams.py
# Candidates below this match percentage are dropped from the ranked
# list returned to the frontend (keeps the "AI-suggested collaborators
# panel" from showing obviously irrelevant people).
MIN_MATCH_PERCENTAGE = float(os.getenv("MIN_MATCH_PERCENTAGE", "20"))

# ------------------------------------------------------------------
# Paths
# ------------------------------------------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SKILLS_TAXONOMY_PATH = os.path.join(BASE_DIR, "data", "skills_taxonomy.json")