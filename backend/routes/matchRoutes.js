const express = require("express");
const router = express.Router();

const { getMatchesForProblem, validateSolutionPreview } = require("../controllers/matchController");
const { protect } = require("../middleware/authMiddleware");

router.get("/:problemId", protect, getMatchesForProblem);
router.post("/validate-solution", protect, validateSolutionPreview);

module.exports = router;