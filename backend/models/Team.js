const mongoose = require("mongoose");

const memberSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    skillContribution: { type: String, default: "" }, // e.g. "Backend / Node.js"
    role: { type: String, enum: ["lead", "member"], default: "member" },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    status: { type: String, enum: ["todo", "in_progress", "done"], default: "todo" },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const messageSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const teamSchema = new mongoose.Schema(
  {
    problemId: { type: mongoose.Schema.Types.ObjectId, ref: "Problem", required: true },
    name: { type: String, required: true },
    members: { type: [memberSchema], default: [] },
    tasks: { type: [taskSchema], default: [] },
    files: { type: [String], default: [] }, // uploaded file URLs
    discussion: { type: [messageSchema], default: [] },
  },
  { timestamps: true }
);

teamSchema.index({ problemId: 1 });

module.exports = mongoose.model("Team", teamSchema);