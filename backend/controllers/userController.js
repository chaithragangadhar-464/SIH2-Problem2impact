const User = require("../models/User");
const { ok, fail } = require("../utils/responseFormatter");
const aiService = require("../services/aiServiceClient");

// GET /api/users/:id
async function getUser(req, res, next) {
  try {
    const user = await User.findById(req.params.id)
      .populate("problemsPosted", "title category status createdAt")
      .populate("teamsJoined", "name problemId")
      .populate("solutionsSubmitted", "problemId reviewStatus submittedAt");

    if (!user) return fail(res, 404, "User not found.");
    return ok(res, 200, { user: user.toSafeObject() });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/users/:id
// Owner-only profile update (bio, location, org/university, availability)
async function updateProfile(req, res, next) {
  try {
    if (String(req.user._id) !== req.params.id) {
      return fail(res, 403, "You can only update your own profile.");
    }

    const allowed = ["name", "bio", "location", "university", "organization", "availableToSolve"];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    const user = await User.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    return ok(res, 200, { user: user.toSafeObject() });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/users/:id/skills
// Updates skills + certifications, and refreshes the cached profile embedding via AI service.
async function updateSkills(req, res, next) {
  try {
    if (String(req.user._id) !== req.params.id) {
      return fail(res, 403, "You can only update your own skills.");
    }

    const { skills, certifications } = req.body;
    const updates = {};
    if (skills !== undefined) updates.skills = skills;
    if (certifications !== undefined) updates.certifications = certifications;

    const user = await User.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    // Best-effort refresh of the embedding cache; do not fail the request if the AI service is down.
    try {
      const profileText = `${user.bio || ""} Skills: ${(user.skills || []).join(", ")}`;
      const embedding = await aiService.embedText(profileText);
      if (embedding?.length) {
        user.profileEmbedding = embedding;
        await user.save();
      }
    } catch (e) {
      console.warn("[userController] embedding refresh skipped:", e.message);
    }

    return ok(res, 200, { user: user.toSafeObject() });
  } catch (err) {
    next(err);
  }
}

module.exports = { getUser, updateProfile, updateSkills };