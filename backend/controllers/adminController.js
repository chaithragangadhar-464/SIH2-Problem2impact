const Problem = require("../models/Problem");
const Solution = require("../models/Solution");
const { ok } = require("../utils/responseFormatter");

// GET /api/admin/dashboard
// For government/NGO/industry accounts: problems they posted, solutions received per problem,
// AI-flagged defective solutions, and valid ones ready to compare/finalize.
async function getDashboard(req, res, next) {
  try {
    const problems = await Problem.find({ postedBy: req.user._id })
      .sort({ createdAt: -1 })
      .select("title category status createdAt solutions");

    const problemIds = problems.map((p) => p._id);

    const solutions = await Solution.find({ problemId: { $in: problemIds } })
      .populate({ path: "teamId", select: "name members", populate: { path: "members.userId", select: "name skills" } })
      .sort({ submittedAt: -1 });

    const solutionsByProblem = {};
    for (const s of solutions) {
      const key = String(s.problemId);
      if (!solutionsByProblem[key]) solutionsByProblem[key] = { valid: [], defective: [], finalized: [] };
      if (s.reviewStatus === "ai_rejected") solutionsByProblem[key].defective.push(s);
      else if (s.reviewStatus === "finalized") solutionsByProblem[key].finalized.push(s);
      else solutionsByProblem[key].valid.push(s);
    }

    const dashboard = problems.map((p) => ({
      problem: p,
      solutions: solutionsByProblem[String(p._id)] || { valid: [], defective: [], finalized: [] },
    }));

    return ok(res, 200, { dashboard });
  } catch (err) {
    next(err);
  }
}

module.exports = { getDashboard };