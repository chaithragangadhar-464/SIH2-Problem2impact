const { body, validationResult } = require("express-validator");
const { fail } = require("./responseFormatter");
const { ROLES } = require("../models/User");
const { CATEGORIES } = require("../models/Problem");

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return fail(
      res,
      400,
      "Validation failed",
      errors.array().map((e) => `${e.path}: ${e.msg}`)
    );
  }
  next();
}

const registerRules = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("email").isEmail().withMessage("Valid email is required").normalizeEmail(),
  body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  body("role").isIn(ROLES).withMessage(`Role must be one of: ${ROLES.join(", ")}`),
  body("skills").optional().isArray().withMessage("Skills must be an array"),
  body("availableToSolve").optional().isBoolean(),
];

const loginRules = [
  body("email").isEmail().withMessage("Valid email is required").normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required"),
];

const problemRules = [
  body("title").trim().notEmpty().withMessage("Title is required"),
  body("description").trim().isLength({ min: 20 }).withMessage("Description should be at least 20 characters"),
  body("location").trim().notEmpty().withMessage("Location is required"),
  body("category").isIn(CATEGORIES).withMessage(`Category must be one of: ${CATEGORIES.join(", ")}`),
  body("expectedOutcome").trim().notEmpty().withMessage("Expected outcome is required"),
  body("hasDomainKnowledge").optional().isBoolean(),
  body("skillsRequired").optional().isArray(),
  body("budget").optional().isFloat({ min: 0 }).withMessage("Budget must be a positive number"),
];

const solutionRules = [
  body("problemId").isMongoId().withMessage("Valid problemId is required"),
  body("teamId").isMongoId().withMessage("Valid teamId is required"),
  body("approach").trim().isLength({ min: 20 }).withMessage("Approach should be at least 20 characters"),
  body("costEstimate").optional().isFloat({ min: 0 }),
];

module.exports = {
  handleValidation,
  registerRules,
  loginRules,
  problemRules,
  solutionRules,
};