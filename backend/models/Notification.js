const mongoose = require("mongoose");

const TYPES = [
  "team_invite",
  "match_suggestion",
  "solution_status",
  "funding_approved",
  "problem_update",
  "general",
];

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: TYPES, default: "general" },
    title: { type: String, required: true },
    message: { type: String, default: "" },
    link: { type: String, default: "" }, // e.g. /problem-detail.html?id=...
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
module.exports.TYPES = TYPES;