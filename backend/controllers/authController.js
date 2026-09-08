const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { JWT_SECRET, JWT_EXPIRES_IN } = require("../config/env");
const { ok, fail } = require("../utils/responseFormatter");
const { sendWelcomeEmail } = require("../services/emailService");

function signToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

// POST /api/auth/register
async function register(req, res, next) {
  try {
    const {
      name,
      email,
      password,
      role,
      skills = [],
      certifications = [],
      availableToSolve = false,
      university,
      organization,
      location,
      bio,
    } = req.body;

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return fail(res, 409, "An account with this email already exists.");
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      passwordHash,
      role,
      skills,
      certifications,
      availableToSolve,
      university,
      organization,
      location,
      bio,
    });

    sendWelcomeEmail(user).catch((e) => console.error("[email] welcome failed", e.message));

    const token = signToken(user);
    return ok(res, 201, { user: user.toSafeObject(), token });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/login
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() }).select("+passwordHash");
    if (!user) return fail(res, 401, "Invalid email or password.");

    const match = await user.comparePassword(password);
    if (!match) return fail(res, 401, "Invalid email or password.");

    const token = signToken(user);
    return ok(res, 200, { user: user.toSafeObject(), token });
  } catch (err) {
    next(err);
  }
}

// GET /api/auth/me
async function getMe(req, res, next) {
  try {
    return ok(res, 200, { user: req.user.toSafeObject() });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, getMe };