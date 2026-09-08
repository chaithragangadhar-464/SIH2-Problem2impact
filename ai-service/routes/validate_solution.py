"""
routes/validate_solution.py
-----------------------------
POST /validate-solution

Given a problem's text and a submitted solution's text, decides whether
the solution is a genuine, relevant attempt or should be auto-flagged as
"defective" before it ever reaches a government/NGO/industry reviewer
(matches your spec: "if there are too many solutions which maybe wrong,
AI should detect the wrong or defective ones and send a note").

Two independent checks, EITHER of which can flag a solution:
  1. LENGTH CHECK   — solutions shorter than a minimum word count are
     almost always low-effort / incomplete, regardless of topic.
  2. RELEVANCE CHECK — cosine similarity between the problem's embedding
     and the solution's embedding. A genuinely on-topic solution should
     be semantically close to the problem it claims to solve; something
     copy-pasted or off-topic will score low.

--------------------------------------------------------------------
HTTP METHOD:  POST
ENDPOINT:     /validate-solution

REQUEST JSON:
{
  "problem_text": "Farmers in drought-prone areas lack an early warning
                    system for water shortages...",
  "solution_text": "We propose a low-cost soil moisture + rainfall
                     sensor network reporting to a mobile app that
                     alerts farmers 48 hours before critical shortage,
                     using a Raspberry Pi gateway and LoRa radios.",
  "min_similarity": 0.35          // optional, overrides config default
}

RESPONSE JSON:
{
  "is_valid": true,
  "similarity_score": 0.62,
  "flagged_reason": null
}

...or for a bad submission:
{
  "is_valid": false,
  "similarity_score": 0.11,
  "flagged_reason": "low relevance to problem statement"
}

EXAMPLE REQUEST (curl):
curl -X POST http://localhost:8000/validate-solution \
  -H "Content-Type: application/json" \
  -d '{"problem_text": "...", "solution_text": "..."}'
--------------------------------------------------------------------
HOW NODE/EXPRESS CALLS THIS:

backend/controllers/solutionController.js, inside POST /api/solutions
(right after the solution + evidence are saved, before it's shown to
the poster/gov dashboard):

    const problem = await Problem.findById(req.body.problemId);

    const aiRes = await aiServiceClient.post("/validate-solution", {
      problem_text: problem.description,
      solution_text: `${req.body.approach}. ${req.body.feasibilityNotes || ""}`,
    });

    solution.aiValidation = {
      isValid: aiRes.data.is_valid,
      similarityScore: aiRes.data.similarity_score,
      flaggedReason: aiRes.data.flagged_reason,
    };
    solution.reviewStatus = aiRes.data.is_valid ? "pending_review" : "ai_rejected";
    await solution.save();

    // if ai_rejected -> submit-solution.js shows:
    // "The solution you have given has some mistakes, better luck next time."
    // if pending_review -> it becomes visible on dashboard-gov.html for
    // the government/NGO/industry account to compare and finalize.

This same endpoint is also what backend/routes/matchRoutes.js exposes
directly to the frontend as POST /api/match/validate-solution (the
matchAPI.validate() call in api.js) if you want a "check before you
submit" preview button on submit-solution.html.
"""

from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field

import config
from models.embedding_model import encode
from utils.similarity import similarity_single
from utils.text_cleaning import clean_text, word_count

router = APIRouter()


# ---- Request / Response models ------------------------------------

class ValidateSolutionRequest(BaseModel):
    problem_text: str = Field(..., min_length=1)
    solution_text: str = Field(..., min_length=1)
    min_similarity: Optional[float] = None  # lets a caller override the default threshold


class ValidateSolutionResponse(BaseModel):
    is_valid: bool
    similarity_score: float
    flagged_reason: Optional[str] = None


# ---- Route ----------------------------------------------------------

@router.post("/validate-solution", response_model=ValidateSolutionResponse)
def validate_solution(payload: ValidateSolutionRequest):
    threshold = payload.min_similarity if payload.min_similarity is not None \
        else config.MIN_SOLUTION_SIMILARITY

    # ---- Check 1: is the solution long enough to be a real attempt? ----
    if word_count(payload.solution_text) < config.MIN_SOLUTION_WORD_COUNT:
        return ValidateSolutionResponse(
            is_valid=False,
            similarity_score=0.0,
            flagged_reason=(
                f"solution is too short/incomplete "
                f"(minimum {config.MIN_SOLUTION_WORD_COUNT} words expected)"
            ),
        )

    # ---- Check 2: is the solution actually about this problem? ----
    problem_vec = encode(clean_text(payload.problem_text))
    solution_vec = encode(clean_text(payload.solution_text))
    score = round(similarity_single(problem_vec, solution_vec), 3)

    if score < threshold:
        return ValidateSolutionResponse(
            is_valid=False,
            similarity_score=score,
            flagged_reason="low relevance to problem statement",
        )

    return ValidateSolutionResponse(
        is_valid=True,
        similarity_score=score,
        flagged_reason=None,
    )