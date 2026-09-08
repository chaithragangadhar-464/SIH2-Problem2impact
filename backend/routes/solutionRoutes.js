const express = require("express");
const router = express.Router();

const {
  submitSolution,
  getSolutionsForProblem,
  finalizeSolution,
} = require("../controllers/solutionController");
const { protect } = require("../middleware/authMiddleware");
const { restrictTo } = require("../middleware/roleMiddleware");
const upload = require("../middleware/uploadMiddleware");
const { solutionRules, handleValidation } = require("../utils/validators");

router.post("/", protect, upload.single("prototype"), solutionRules, handleValidation, submitSolution);
router.get("/problem/:id", protect, getSolutionsForProblem);
router.patch("/:id/finalize", protect, restrictTo("government", "ngo", "industry"), finalizeSolution);

module.exports = router;