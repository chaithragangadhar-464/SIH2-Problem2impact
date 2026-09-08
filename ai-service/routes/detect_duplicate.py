"""
routes/detect_duplicate.py
-----------------------------
POST /detect-duplicate

Given a new piece of text (typically a newly-posted problem's
description) and a list of existing items, returns which existing items
are near-duplicates — so the platform can warn a citizen "a similar
problem already exists, want to join that one instead?" rather than
fragmenting effort across duplicate postings.

Generic by design: works for problems-vs-problems today, but the
request shape (`text` + `existing: [{id, text}]`) also works unchanged
for solutions-vs-solutions if you want that later.

--------------------------------------------------------------------
HTTP METHOD:  POST
ENDPOINT:     /detect-duplicate

REQUEST JSON:
{
  "text": "Farmers in our village have no way to know when water
            levels are critically low until it's too late",
  "existing": [
    {"id": "p_501", "text": "Need early warning system for water
                              shortage in drought areas"},
    {"id": "p_502", "text": "Lack of streetlights on the highway
                              causing accidents at night"}
  ],
  "threshold": 0.85          // optional, overrides config default
}

RESPONSE JSON:
{
  "is_duplicate": true,
  "duplicates": [
    {"id": "p_501", "similarity": 0.89}
  ]
}
(sorted by similarity descending; only items >= threshold are included)

EXAMPLE REQUEST (curl):
curl -X POST http://localhost:8000/detect-duplicate \
  -H "Content-Type: application/json" \
  -d '{"text": "...", "existing": [{"id":"p1","text":"..."}]}'
--------------------------------------------------------------------
HOW NODE/EXPRESS CALLS THIS:

backend/controllers/problemController.js, inside POST /api/problems,
BEFORE saving the new problem (so you can warn the user first):

    const recentSimilarCandidates = await Problem.find({
      category: req.body.category,   // pre-filter by category = cheap + relevant
      status: { $ne: "closed" },
    }).select("_id description").limit(200);

    const aiRes = await aiServiceClient.post("/detect-duplicate", {
      text: req.body.description,
      existing: recentSimilarCandidates.map(p => ({
        id: p._id.toString(),
        text: p.description,
      })),
    });

    if (aiRes.data.is_duplicate) {
      // Option A: return 409 with the duplicate ids and let post-problem.js
      // show "Similar problems already exist — post anyway?" before
      // calling POST /api/problems again with a `force: true` flag.
      return res.status(409).json({
        message: "Similar problem(s) already exist",
        duplicates: aiRes.data.duplicates,
      });
    }
    // ... otherwise continue creating the Problem document as normal
"""

from typing import List, Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field

import config
from models.embedding_model import encode
from utils.similarity import similarity_one_to_many

router = APIRouter()


# ---- Request / Response models ------------------------------------

class ExistingItem(BaseModel):
    id: str
    text: str


class DetectDuplicateRequest(BaseModel):
    text: str = Field(..., min_length=1)
    existing: List[ExistingItem] = Field(default_factory=list)
    threshold: Optional[float] = None  # lets a caller override the default threshold


class DuplicateMatch(BaseModel):
    id: str
    similarity: float


class DetectDuplicateResponse(BaseModel):
    is_duplicate: bool
    duplicates: List[DuplicateMatch]


# ---- Route ----------------------------------------------------------

@router.post("/detect-duplicate", response_model=DetectDuplicateResponse)
def detect_duplicate(payload: DetectDuplicateRequest):
    threshold = payload.threshold if payload.threshold is not None \
        else config.DUPLICATE_SIMILARITY_THRESHOLD

    if not payload.existing:
        return DetectDuplicateResponse(is_duplicate=False, duplicates=[])

    new_vec = encode(payload.text)
    existing_texts = [item.text for item in payload.existing]
    existing_vecs = encode(existing_texts)

    scores = similarity_one_to_many(new_vec, existing_vecs)

    duplicates = [
        DuplicateMatch(id=item.id, similarity=round(score, 3))
        for item, score in zip(payload.existing, scores)
        if score >= threshold
    ]
    duplicates.sort(key=lambda d: d.similarity, reverse=True)

    return DetectDuplicateResponse(
        is_duplicate=len(duplicates) > 0,
        duplicates=duplicates,
    )