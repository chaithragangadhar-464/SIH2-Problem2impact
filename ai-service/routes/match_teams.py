"""
routes/match_teams.py
----------------------
POST /match-teams

Given a problem (its text + the skills it needs) and a pool of candidate
users, returns candidates ranked by how good a match they are — this is
what powers:
  - the "AI-suggested collaborators panel" on problem-detail.html
  - the "invite AI-matched user" button on team.html (frontend can just
    filter this same ranked list down to whichever skill is missing)

How the score is built:
  1. We build one embedding for the PROBLEM (its description + the
     skills it needs, so the vector "knows" what's required).
  2. We build one embedding per CANDIDATE (their skills + optional bio).
  3. Cosine similarity between problem-vector and each candidate-vector
     -> converted to a 0-100 percentage (see utils/similarity.py).
  4. We also compute an explicit `matched_skills` / `missing_skills`
     list via simple set overlap, so the frontend can show
     "You need someone with IoT knowledge" (mentioned in your spec)
     without having to re-derive it itself.

--------------------------------------------------------------------
HTTP METHOD:  POST
ENDPOINT:     /match-teams

REQUEST JSON:
{
  "problem_text": "Build a soil moisture monitoring app for farmers",
  "required_skills": ["IoT", "Mobile Development", "Agronomy"],
  "candidates": [
    {
      "user_id": "u_101",
      "skills": ["IoT", "Embedded Systems"],
      "bio": "Final year ECE student, built 3 Arduino sensor projects"
    },
    {
      "user_id": "u_102",
      "skills": ["Mobile Development", "UI/UX Design"],
      "bio": "Flutter developer, 2 published apps"
    }
  ]
}

RESPONSE JSON:
{
  "matches": [
    {
      "user_id": "u_101",
      "match_percentage": 94.2,
      "matched_skills": ["IoT"],
      "missing_skills": ["Mobile Development", "Agronomy"]
    },
    {
      "user_id": "u_102",
      "match_percentage": 61.5,
      "matched_skills": ["Mobile Development"],
      "missing_skills": ["IoT", "Agronomy"]
    }
  ]
}
(sorted by match_percentage descending; candidates below
config.MIN_MATCH_PERCENTAGE are dropped entirely)

EXAMPLE REQUEST (curl):
curl -X POST http://localhost:8000/match-teams \
  -H "Content-Type: application/json" \
  -d '{"problem_text":"...", "required_skills":["IoT"], "candidates":[...]}'
--------------------------------------------------------------------
HOW NODE/EXPRESS CALLS THIS:

backend/controllers/matchController.js, for GET /api/match/:problemId:

    const problem = await Problem.findById(req.params.problemId);

    // Candidate pool: everyone who opted in to solve problems,
    // excluding the poster themselves.
    const candidates = await User.find({
      availableToSolve: true,
      _id: { $ne: problem.postedBy },
    }).select("_id skills bio");

    const aiRes = await aiServiceClient.post("/match-teams", {
      problem_text: `${problem.description}`,
      required_skills: problem.skillsRequired || [],
      candidates: candidates.map(u => ({
        user_id: u._id.toString(),
        skills: u.skills,
        bio: u.bio || "",
      })),
    });

    res.json(aiRes.data.matches); // -> frontend problem-detail.js renders this
"""

from typing import List, Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field

import config
from models.embedding_model import encode
from utils.similarity import similarity_one_to_many, to_percentage

router = APIRouter()


# ---- Request / Response models ------------------------------------

class Candidate(BaseModel):
    user_id: str
    skills: List[str] = Field(default_factory=list)
    bio: Optional[str] = ""


class MatchTeamsRequest(BaseModel):
    problem_text: str = Field(..., min_length=1)
    required_skills: List[str] = Field(default_factory=list)
    candidates: List[Candidate] = Field(default_factory=list)


class MatchResult(BaseModel):
    user_id: str
    match_percentage: float
    matched_skills: List[str]
    missing_skills: List[str]


class MatchTeamsResponse(BaseModel):
    matches: List[MatchResult]


# ---- Route ----------------------------------------------------------

@router.post("/match-teams", response_model=MatchTeamsResponse)
def match_teams(payload: MatchTeamsRequest):
    if not payload.candidates:
        return MatchTeamsResponse(matches=[])

    # Build the text we embed for the problem: description + the skills
    # it needs, so the vector captures BOTH the domain context and the
    # explicit skill requirements.
    problem_full_text = payload.problem_text
    if payload.required_skills:
        problem_full_text += ". Skills needed: " + ", ".join(payload.required_skills)
    problem_vec = encode(problem_full_text)

    # Build one text per candidate: their skill list + bio.
    candidate_texts = [
        ", ".join(c.skills) + (". " + c.bio if c.bio else "")
        for c in payload.candidates
    ]
    candidate_vecs = encode(candidate_texts)

    scores = similarity_one_to_many(problem_vec, candidate_vecs)

    required_lower = {s.lower(): s for s in payload.required_skills}

    results: List[MatchResult] = []
    for candidate, score in zip(payload.candidates, scores):
        pct = to_percentage(score)
        if pct < config.MIN_MATCH_PERCENTAGE:
            continue  # not a useful suggestion, skip it

        candidate_skills_lower = {s.lower() for s in candidate.skills}
        matched = [orig for low, orig in required_lower.items() if low in candidate_skills_lower]
        missing = [orig for low, orig in required_lower.items() if low not in candidate_skills_lower]

        results.append(MatchResult(
            user_id=candidate.user_id,
            match_percentage=pct,
            matched_skills=matched,
            missing_skills=missing,
        ))

    # Highest match first
    results.sort(key=lambda r: r.match_percentage, reverse=True)
    return MatchTeamsResponse(matches=results)