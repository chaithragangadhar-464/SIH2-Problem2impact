const express = require("express");
const router = express.Router();

const {
  createTeam,
  getTeam,
  inviteMember,
  addTask,
  updateTask,
  postMessage,
} = require("../controllers/teamController");
const { protect } = require("../middleware/authMiddleware");

router.post("/", protect, createTeam);
router.get("/:id", getTeam);
router.post("/:id/invite", protect, inviteMember);
router.post("/:id/tasks", protect, addTask);
router.patch("/:id/tasks/:taskId", protect, updateTask);
router.post("/:id/discussion", protect, postMessage);

module.exports = router;