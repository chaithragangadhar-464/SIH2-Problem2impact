const express = require("express");
const router = express.Router();

const { getDashboard } = require("../controllers/adminController");
const { protect } = require("../middleware/authMiddleware");
const { restrictTo } = require("../middleware/roleMiddleware");

router.get("/dashboard", protect, restrictTo("government", "ngo", "industry"), getDashboard);

module.exports = router;