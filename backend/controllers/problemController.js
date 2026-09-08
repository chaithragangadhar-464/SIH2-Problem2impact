const Problem = require("../models/Problem");
const User = require("../models/User");
const { ok, fail } = require("../utils/responseFormatter");
const aiService = require("../services/aiServiceClient");

// POST /api/problems
async function createProblem(req, res, next) {
  try {
    const {
      title,
      description,
      location,
      category,
      expectedOutcome,
      hasDomainKnowledge = false,
      skillsRequired = [],
      budget = null,
    } = req.body;

    // Evidence files come in via multer (req.files) if uploaded as multipart,
    // or as an array of URLs if the client already hosts them.
    const uploadedPaths = (req.files || []).map((f) => `/uploads/${f.filename}`);
    const evidence = [...uploadedPaths, ...(Array.isArray(req.body.evidenceUrls) ? req.body.evidenceUrls : [])];

    const problem = await Problem.create({
      title,
      description,
      evidence,
      location,
      category,
      expectedOutcome,
      hasDomainKnowledge,
      skillsRequired: hasDomainKnowledge ? skillsRequired : [],
      budget,
      postedBy: req.user._id,
    });

    // Best-effort: auto-extract skills/domain tags + cache description embedding.
    try {
      if (!hasDomainKnowledge || skillsRequired.length === 0) {
        const extracted = await aiService.extractSkills(`${title}. ${description}`);
        if (extracted?.skills?.length) {
          problem.skillsRequired = extracted.skills;
        }
      }
      const embedding = await aiService.embedText(`${title}. ${description}. ${expectedOutcome}`);
      if (embedding?.length) problem.descriptionEmbedding = embedding;
      await problem.save();
    } catch (e) {
      console.warn("[problemController] AI enrichment skipped:", e.message);
    }

    await User.findByIdAndUpdate(req.user._id, { $push: { problemsPosted: problem._id } });

    return ok(res, 201, { problem });
  } catch (err) {
    next(err);
  }
}

// GET /api/problems?category=&location=&search=&status=&sort=&page=&limit=
async function listProblems(req, res, next) {
  try {
    const { category, location, search, status, sort = "newest", page = 1, limit = 20 } = req.query;

    const filter = {};
    if (category) filter.category = category;
    if (location) filter.location = new RegExp(location, "i");
    if (status) filter.status = status;
    if (search) filter.$text = { $search: search };

    const sortMap = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      "most-solutions": { "solutions.length": -1 }, // note: aggregate below handles this better if needed
      deadline: { createdAt: 1 },
    };

    const skip = (Number(page) - 1) * Number(limit);

    const [problems, total] = await Promise.all([
      Problem.find(filter)
        .populate("postedBy", "name role organization")
        .sort(sortMap[sort] || sortMap.newest)
        .skip(skip)
        .limit(Number(limit)),
      Problem.countDocuments(filter),
    ]);

    return ok(res, 200, { problems }, { total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    next(err);
  }
}

// GET /api/problems/:id
async function getProblem(req, res, next) {
  try {
    const problem = await Problem.findById(req.params.id)
      .populate("postedBy", "name role organization location")
      .populate("teams", "name members")
      .populate({
        path: "solutions",
        select: "teamId reviewStatus aiValidation submittedAt awardAmount",
      });

    if (!problem) return fail(res, 404, "Problem not found.");
    return ok(res, 200, { problem });
  } catch (err) {
    next(err);
  }
}

// GET /api/problems/category/:cat  (Explore Challenges)
async function getProblemsByCategory(req, res, next) {
  try {
    const { cat } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [problems, total] = await Promise.all([
      Problem.find({ category: cat, status: { $in: ["open", "in_progress"] } })
        .populate("postedBy", "name role organization")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Problem.countDocuments({ category: cat }),
    ]);

    return ok(res, 200, { problems }, { total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/problems/:id/status  (internal use — e.g. when a solution is finalized)
async function updateStatus(req, res, next) {
  try {
    const { status } = req.body;
    const problem = await Problem.findById(req.params.id);
    if (!problem) return fail(res, 404, "Problem not found.");

    if (String(problem.postedBy) !== String(req.user._id) && !["government", "ngo", "industry"].includes(req.user.role)) {
      return fail(res, 403, "Not authorized to update this problem's status.");
    }

    problem.status = status;
    await problem.save();
    return ok(res, 200, { problem });
  } catch (err) {
    next(err);
  }
}

module.exports = { createProblem, listProblems, getProblem, getProblemsByCategory, updateStatus };