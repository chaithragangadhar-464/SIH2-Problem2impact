const mongoose = require("mongoose");

const REVIEW_STATUSES = ["ai_rejected", "pending_review", "finalized", "not_selected"];

const solutionSchema = new mongoose.Schema(
  {
    problemId: { type: mongoose.Schema.Types.ObjectId, ref: "Problem", required: true },
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true },

    approach: { type: String, required: true },
    prototypeUrl: { type: String, default: "" }, // link or uploaded file path
    costEstimate: { type: Number, default: null },
    feasibilityNotes: { type: String, default: "" },
    implementationPlan: { type: String, default: "" },

    aiValidation: {
      isValid: { type: Boolean, default: null },
      similarityScore: { type: Number, default: null },
      flaggedReason: { type: String, default: "" }, // e.g. "low relevance to problem statement"
      checkedAt: { type: Date, default: null },
    },

    reviewStatus: { type: String, enum: REVIEW_STATUSES, default: "pending_review" },

    awardAmount: { type: Number, default: null },
    awardedCertificates: { type: Boolean, default: false },

    submittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

solutionSchema.index({ problemId: 1 });
solutionSchema.index({ reviewStatus: 1 });

module.exports = mongoose.model("Solution", solutionSchema);
module.exports.REVIEW_STATUSES = REVIEW_STATUSES;