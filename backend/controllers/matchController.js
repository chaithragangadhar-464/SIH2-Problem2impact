const Problem = require("../models/Problem");
const User = require("../models/User");
const { ok, fail } = require("../utils/responseFormatter");
const aiService = require("../services/aiServiceClient");

// GET /api/match/:problemId
// Returns a ranked list of candidate collaborators (students, industry, anyone available)
// with a % match score, based on the problem's required skills vs each user's skills/embedding.
async function getMatchesForProblem(req, res, next) {
  try {
    const problem = await Problem.findById(req.params.problemId);
    if (!problem) return fail(res, 404, "Problem not found.");

    const candidates = await User.find({
      availableToSolve: true,
      _id: { $ne: problem.postedBy },
    }).select("name role skills bio university organization profileEmbedding");

    if (candidates.length === 0) {
      return ok(res, 200, { matches: [] });
    }

    const problemText = `${problem.title}. ${problem.description}. Skills needed: ${(problem.skillsRequired || []).join(", ")}`;

    let ranked = [];
    try {
      ranked = await aiService.matchTeams(
        problemText,
        problem.skillsRequired,
        candidates.map((c) => ({
          userId: String(c._id),
          profileText: `${c.bio || ""} Skills: ${(c.skills || []).join(", ")}`,
        }))
      );
    } catch (e) {
      console.warn("[matchController] AI service unreachable, falling back to keyword overlap:", e.message);
      // Fallback: simple skill-overlap percentage so the feature still works if the AI service is down.
      ranked = candidates
        .map((c) => {
          const required = (problem.skillsRequired || []).map((s) => s.toLowerCase());
          const has = (c.skills || []).map((s) => s.toLowerCase());
          const overlap = required.filter((s) => has.includes(s));
          const score = required.length ? Math.round((overlap.length / required.length) * 100) : 0;
          return { userId: String(c._id), matchScore: score };
        })
        .sort((a, b) => b.matchScore - a.matchScore);
    }

    const byId = Object.fromEntries(candidates.map((c) => [String(c._id), c]));
    const matches = ranked
      .filter((r) => byId[r.userId])
      .map((r) => ({
        user: {
          _id: byId[r.userId]._id,
          name: byId[r.userId].name,
          role: byId[r.userId].role,
          skills: byId[r.userId].skills,
          university: byId[r.userId].university,
          organization: byId[r.userId].organization,
        },
        matchScore: r.matchScore,
      }));

    return ok(res, 200, { matches });
  } catch (err) {
    next(err);
  }
}

// POST /api/match/validate-solution
// { problemId, solutionText } -> proxies to AI service defect check (used ad-hoc, e.g. a "preview" before formal submit)
async function validateSolutionPreview(req, res, next) {
  try {
    const { problemId, solutionText } = req.body;
    const problem = await Problem.findById(problemId);
    if (!problem) return fail(res, 404, "Problem not found.");

    const validation = await aiService.validateSolution(
      `${problem.title}. ${problem.description}. Expected outcome: ${problem.expectedOutcome}`,
      solutionText
    );

    return ok(res, 200, { validation });
  } catch (err) {
    next(err);
  }
}

module.exports = { getMatchesForProblem, validateSolutionPreview };