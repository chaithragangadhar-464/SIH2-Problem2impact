"""
routes/extract_skills.py
-------------------------
POST /extract-skills

Given a free-text description (a problem's description, or a poster's
bio/skills blurb), returns a list of canonical skill tags from our
taxonomy that appear to be relevant.

Two-pass approach (keeps it accurate AND explainable, which is nice for
a hackathon demo/judges):
  1. KEYWORD PASS  — fast, exact: does any synonym literally appear in
     the text? (e.g. "IoT" literally mentioned)
  2. SEMANTIC PASS — catches paraphrasing the keyword pass misses, by
     comparing the embedding of the whole text against the embedding of
     each taxonomy skill label. (e.g. text says "soil moisture sensors
     for farmers" -> semantically close to "IoT" and "Agronomy" even
     though neither word is present verbatim)

--------------------------------------------------------------------
HTTP METHOD:  POST
ENDPOINT:     /extract-skills

REQUEST JSON:
{
  "text": "We want to build a low-cost soil moisture sensor network
            that farmers can monitor from a mobile app."
}

RESPONSE JSON:
{
  "extracted_skills": ["IoT", "Agronomy", "Mobile Development"],
  "details": [
    {"skill": "IoT", "method": "keyword", "score": 1.0},
    {"skill": "Agronomy", "method": "semantic", "score": 0.41},
    {"skill": "Mobile Development", "method": "semantic", "score": 0.38}
  ]
}

EXAMPLE REQUEST (curl):
curl -X POST http://localhost:8000/extract-skills \
  -H "Content-Type: application/json" \
  -d '{"text": "Need an app that detects crop diseases using photos"}'

EXAMPLE RESPONSE:
{
  "extracted_skills": ["Computer Vision", "Agronomy", "Mobile Development"],
  "details": [...]
}
--------------------------------------------------------------------
HOW NODE/EXPRESS CALLS THIS:

In backend/controllers/problemController.js, when a citizen creates a
problem (POST /api/problems), after saving the doc you can optionally
auto-tag it:

    const aiRes = await aiServiceClient.post("/extract-skills", {
      text: problem.description,
    });
    problem.skillsRequired = aiRes.data.extracted_skills; // if poster
                                                            // didn't set any
    await problem.save();

Same endpoint can be reused in userController.js when a user updates
their bio, to suggest skill tags for their profile (PATCH /api/users/:id/skills).
"""

import json
from functools import lru_cache
from typing import Dict, List

from fastapi import APIRouter
from pydantic import BaseModel, Field

import config
from models.embedding_model import encode
from utils.similarity import similarity_single
from utils.text_cleaning import clean_text

router = APIRouter()


@lru_cache(maxsize=1)
def load_taxonomy() -> Dict[str, List[str]]:
    """
    Loads data/skills_taxonomy.json once and caches it in memory.
    Shape: { "IoT": ["iot", "arduino", "raspberry pi"], ... }
    """
    with open(config.SKILLS_TAXONOMY_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


# ---- Request / Response models ------------------------------------

class ExtractSkillsRequest(BaseModel):
    text: str = Field(..., min_length=1, description="Problem or profile text to analyze")


class SkillMatchDetail(BaseModel):
    skill: str
    method: str  # "keyword" or "semantic"
    score: float


class ExtractSkillsResponse(BaseModel):
    extracted_skills: List[str]
    details: List[SkillMatchDetail]


# ---- Route ----------------------------------------------------------

@router.post("/extract-skills", response_model=ExtractSkillsResponse)
def extract_skills(payload: ExtractSkillsRequest):
    taxonomy = load_taxonomy()  # { "IoT": ["iot", "arduino", ...], ... }
    cleaned = clean_text(payload.text)

    found: dict[str, SkillMatchDetail] = {}

    # ---- Pass 1: keyword matching (exact substring) ----
    for skill_name, synonyms in taxonomy.items():
        for synonym in synonyms + [skill_name.lower()]:
            if synonym in cleaned:
                found[skill_name] = SkillMatchDetail(skill=skill_name, method="keyword", score=1.0)
                break

    # ---- Pass 2: semantic matching (embedding similarity) ----
    # Only bother running this for skills the keyword pass didn't already find.
    remaining_skills = [s for s in taxonomy.keys() if s not in found]
    if remaining_skills and cleaned:
        text_vec = encode(cleaned)
        skill_vecs = encode(remaining_skills)  # batch-encode is much faster than one-by-one
        for skill_name, skill_vec in zip(remaining_skills, skill_vecs):
            score = similarity_single(text_vec, skill_vec)
            if score >= config.SKILL_EXTRACTION_THRESHOLD:
                found[skill_name] = SkillMatchDetail(
                    skill=skill_name, method="semantic", score=round(score, 3)
                )

    # Sort: keyword matches first (they're more certain), then by score desc
    details = sorted(found.values(), key=lambda d: (d.method != "keyword", -d.score))

    return ExtractSkillsResponse(
        extracted_skills=[d.skill for d in details],
        details=details,
    )