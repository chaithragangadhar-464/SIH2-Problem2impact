const express = require("express");
const router = express.Router();

const { getUser, updateProfile, updateSkills } = require("../controllers/userController");
const { protect } = require("../middleware/authMiddleware");

router.get("/:id", getUser);
router.patch("/:id", protect, updateProfile);
router.patch("/:id/skills", protect, updateSkills);

module.exports = router;