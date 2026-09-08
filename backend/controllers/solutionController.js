const Solution = require("../models/Solution");
const Problem = require("../models/Problem");
const Team = require("../models/Team");
const User = require("../models/User");
const { ok, fail } = require("../utils/responseFormatter");
const aiService = require("../services/aiServiceClient");
const { notify, notifyMany } = require("../services/notificationService");
const { sendFundingApprovedEmail } = require("../services/emailService");

// POST /api/solutions
// { problemId, teamId, approach, prototypeUrl, costEstimate, feasibilityNotes, implementationPlan }
async function submitSolution(req, res, next) {
  try {
    const { problemId, teamId, approach, prototypeUrl = "", costEstimate = null, feasibilityNotes = "", implementationPlan = "" } = req.body;

    const [problem, team] = await Promise.all([Problem.findById(problemId), Team.findById(teamId)]);
    if (!problem) return fail(res, 404, "Problem not found.");
    if (!team) return fail(res, 404, "Team not found.");

    const isMember = team.members.some((m) => String(m.userId) === String(req.user._id));
    if (!isMember) return fail(res, 403, "Only team members can submit a solution for this team.");

    const uploadedPrototype = req.file ? `/uploads/${req.file.filename}` : prototypeUrl;

    const solution = await Solution.create({
      problemId,
      teamId,
      approach,
      prototypeUrl: uploadedPrototype,
      costEstimate,
      feasibilityNotes,
      implementationPlan,
      reviewStatus: "pending_review",
    });

    problem.solutions.push(solution._id);
    if (problem.status === "open") {
      problem.status = "under_review";
    }
    await problem.save();

    for (const member of team.members) {
      await User.findByIdAndUpdate(member.userId, { $push: { solutionsSubmitted: solution._id } });
    }

    // Run AI validation (defect / relevance check). Best-effort — falls back to manual review if AI is unreachable.
    try {
      const validation = await aiService.validateSolution(
        `${problem.title}. ${problem.description}. Expected outcome: ${problem.expectedOutcome}`,
        `${approach}. ${feasibilityNotes}. ${implementationPlan}`
      );

      solution.aiValidation = {
        isValid: validation.isValid,
        similarityScore: validation.similarityScore,
        flaggedReason: validation.flaggedReason || "",
        checkedAt: new Date(),
      };

      if (validation.isValid === false) {
        solution.reviewStatus = "ai_rejected";
      }
      await solution.save();

      const memberIds = team.members.map((m) => m.userId);
      if (validation.isValid === false) {
        await notifyMany(memberIds, {
          type: "solution_status",
          title: "Your solution needs work",
          message: `The solution you submitted for "${problem.title}" has some issues (${validation.flaggedReason || "low relevance"}). Better luck next time — you're welcome to revise and resubmit.`,
          link: `/problem-detail.html?id=${problem._id}`,
        });
      } else {
        await notifyMany(memberIds, {
          type: "solution_status",
          title: "Solution passed AI review",
          message: `Your solution for "${problem.title}" passed initial checks and is now with the reviewing organization.`,
          link: `/problem-detail.html?id=${problem._id}`,
        });
      }
    } catch (e) {
      console.warn("[solutionController] AI validation skipped:", e.message);
    }

    return ok(res, 201, { solution });
  } catch (err) {
    next(err);
  }
}

// GET /api/solutions/problem/:id  (all solutions for a problem — gov/industry review view)
async function getSolutionsForProblem(req, res, next) {
  try {
    const solutions = await Solution.find({ problemId: req.params.id })
      .populate({ path: "teamId", select: "name members", populate: { path: "members.userId", select: "name skills" } })
      .sort({ submittedAt: -1 });

    return ok(res, 200, { solutions });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/solutions/:id/finalize   { awardAmount }  — gov/industry only
async function finalizeSolution(req, res, next) {
  try {
    const { awardAmount } = req.body;

    const solution = await Solution.findById(req.params.id).populate({
      path: "teamId",
      populate: { path: "members.userId", select: "name email" },
    });
    if (!solution) return fail(res, 404, "Solution not found.");

    if (solution.reviewStatus === "ai_rejected") {
      return fail(res, 400, "This solution was flagged by AI review and cannot be finalized as-is.");
    }

    solution.reviewStatus = "finalized";
    solution.awardAmount = awardAmount ?? solution.awardAmount;
    solution.awardedCertificates = true;
    await solution.save();

    const problem = await Problem.findById(solution.problemId);
    if (problem) {
      problem.status = "solved";
      problem.finalizedSolution = solution._id;
      await problem.save();
    }

    // Mark sibling solutions on the same problem as not_selected
    await Solution.updateMany(
      { problemId: solution.problemId, _id: { $ne: solution._id }, reviewStatus: "pending_review" },
      { $set: { reviewStatus: "not_selected" } }
    );

    const members = solution.teamId.members;
    for (const m of members) {
      await notify({
        user: m.userId._id,
        type: "funding_approved",
        title: "Your solution was funded! 🎉",
        message: `"${problem?.title}" — your team was awarded ₹${solution.awardAmount} and certificates for all members.`,
        link: `/problem-detail.html?id=${problem?._id}`,
      });
      sendFundingApprovedEmail(m.userId, solution.awardAmount, problem?.title).catch((e) =>
        console.error("[email] funding notice failed", e.message)
      );
    }

    return ok(res, 200, { solution });
  } catch (err) {
    next(err);
  }
}

module.exports = { submitSolution, getSolutionsForProblem, finalizeSolution };