const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const ROLES = ["citizen", "student", "faculty", "employee", "government", "ngo", "industry"];

const certificationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    issuer: { type: String },
    url: { type: String }, // link/file path to the certificate
    issuedAt: { type: Date },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },

    role: { type: String, enum: ROLES, required: true, default: "citizen" },

    // Skills the user has
    skills: { type: [String], default: [] },
    certifications: { type: [certificationSchema], default: [] },

    // Whether they're open to solving problems / joining teams
    availableToSolve: { type: Boolean, default: false },

    bio: { type: String, default: "" },
    university: { type: String, default: null }, // student/faculty
    organization: { type: String, default: null }, // gov/ngo/industry
    location: { type: String, default: "" },

    // Cached embedding vector produced by the AI service from skills/bio,
    // used for fast collaborator matching without re-calling the AI service each time.
    profileEmbedding: { type: [Number], default: [] },

    badges: { type: [String], default: [] },

    problemsPosted: [{ type: mongoose.Schema.Types.ObjectId, ref: "Problem" }],
    teamsJoined: [{ type: mongoose.Schema.Types.ObjectId, ref: "Team" }],
    solutionsSubmitted: [{ type: mongoose.Schema.Types.ObjectId, ref: "Solution" }],
  },
  { timestamps: true }
);

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.__v;
  return obj;
};

userSchema.index({ skills: 1 });
userSchema.index({ role: 1 });

module.exports = mongoose.model("User", userSchema);
module.exports.ROLES = ROLES;