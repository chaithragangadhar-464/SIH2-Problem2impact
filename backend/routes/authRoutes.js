const express = require("express");
const router = express.Router();

const { register, login, getMe } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const { registerRules, loginRules, handleValidation } = require("../utils/validators");

router.post("/register", registerRules, handleValidation, register);
router.post("/login", loginRules, handleValidation, login);
router.get("/me", protect, getMe);

module.exports = router;