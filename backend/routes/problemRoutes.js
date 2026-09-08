const express = require("express");
const router = express.Router();

const {
  createProblem,
  listProblems,
  getProblem,
  getProblemsByCategory,
  updateStatus,
} = require("../controllers/problemController");
const { protect } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");
const { problemRules, handleValidation } = require("../utils/validators");

router.post("/", protect, upload.array("evidence", 5), problemRules, handleValidation, createProblem);
router.get("/", listProblems);
router.get("/category/:cat", getProblemsByCategory);
router.get("/:id", getProblem);
router.patch("/:id/status", protect, updateStatus);

module.exports = router;