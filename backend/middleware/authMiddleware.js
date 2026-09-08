const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config/env");
const User = require("../models/User");
const { fail } = require("../utils/responseFormatter");

/**
 * Verifies the Bearer JWT and attaches req.user (without passwordHash).
 */
async function protect(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.split(" ")[1] : null;

    if (!token) {
      return fail(res, 401, "Not authenticated. Please log in.");
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return fail(res, 401, "User for this token no longer exists.");
    }

    req.user = user;
    next();
  } catch (err) {
    return fail(res, 401, "Invalid or expired token.");
  }
}

/**
 * Optional auth — attaches req.user if a valid token is present, but never blocks the request.
 * Useful for public routes that personalize output when logged in (e.g. match %).
 */
async function optionalAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.split(" ")[1] : null;
    if (!token) return next();

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (user) req.user = user;
  } catch (_) {
    // ignore invalid token for optional auth
  }
  next();
}

module.exports = { protect, optionalAuth };