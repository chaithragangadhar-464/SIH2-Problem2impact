const Team = require("../models/Team");
const Problem = require("../models/Problem");
const User = require("../models/User");
const { ok, fail } = require("../utils/responseFormatter");
const { notify } = require("../services/notificationService");
const { sendTeamInviteEmail } = require("../services/emailService");

// POST /api/teams   { problemId, name, skillContribution }
// Creates a team for a problem with the requester as its first member/lead.
async function createTeam(req, res, next) {
  try {
    const { problemId, name, skillContribution = "" } = req.body;

    const problem = await Problem.findById(problemId);
    if (!problem) return fail(res, 404, "Problem not found.");

    const team = await Team.create({
      problemId,
      name: name || `${req.user.name}'s Team`,
      members: [{ userId: req.user._id, skillContribution, role: "lead" }],
    });

    problem.teams.push(team._id);
    await problem.save();

    await User.findByIdAndUpdate(req.user._id, { $push: { teamsJoined: team._id } });

    return ok(res, 201, { team });
  } catch (err) {
    next(err);
  }
}

// GET /api/teams/:id
async function getTeam(req, res, next) {
  try {
    const team = await Team.findById(req.params.id)
      .populate("members.userId", "name role skills organization university")
      .populate("problemId", "title category skillsRequired")
      .populate("tasks.assignedTo", "name")
      .populate("discussion.sender", "name");

    if (!team) return fail(res, 404, "Team not found.");
    return ok(res, 200, { team });
  } catch (err) {
    next(err);
  }
}

// POST /api/teams/:id/invite   { userId, skillContribution }
// Invites another user (student from another university, industry collaborator, etc.)
async function inviteMember(req, res, next) {
  try {
    const { userId, skillContribution = "" } = req.body;

    const team = await Team.findById(req.params.id);
    if (!team) return fail(res, 404, "Team not found.");

    const isMember = team.members.some((m) => String(m.userId) === String(req.user._id));
    if (!isMember) return fail(res, 403, "Only current team members can invite others.");

    const alreadyIn = team.members.some((m) => String(m.userId) === String(userId));
    if (alreadyIn) return fail(res, 409, "That user is already on this team.");

    const invitee = await User.findById(userId);
    if (!invitee) return fail(res, 404, "Invited user not found.");

    team.members.push({ userId, skillContribution, role: "member" });
    await team.save();

    await User.findByIdAndUpdate(userId, { $addToSet: { teamsJoined: team._id } });

    const problem = await Problem.findById(team.problemId).select("title");

    await notify({
      user: userId,
      type: "team_invite",
      title: `You've joined "${team.name}"`,
      message: `You were added to the team working on "${problem?.title || "a problem"}".`,
      link: `/team.html?id=${team._id}`,
    });
    sendTeamInviteEmail(invitee, team, problem?.title).catch((e) =>
      console.error("[email] invite failed", e.message)
    );

    return ok(res, 200, { team });
  } catch (err) {
    next(err);
  }
}

// POST /api/teams/:id/tasks   { title, assignedTo }
async function addTask(req, res, next) {
  try {
    const { title, assignedTo = null } = req.body;
    const team = await Team.findById(req.params.id);
    if (!team) return fail(res, 404, "Team not found.");

    team.tasks.push({ title, assignedTo });
    await team.save();
    return ok(res, 201, { team });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/teams/:id/tasks/:taskId   { status }
async function updateTask(req, res, next) {
  try {
    const { status } = req.body;
    const team = await Team.findById(req.params.id);
    if (!team) return fail(res, 404, "Team not found.");

    const task = team.tasks.id(req.params.taskId);
    if (!task) return fail(res, 404, "Task not found.");

    task.status = status;
    await team.save();
    return ok(res, 200, { team });
  } catch (err) {
    next(err);
  }
}

// POST /api/teams/:id/discussion   { text }
async function postMessage(req, res, next) {
  try {
    const { text } = req.body;
    const team = await Team.findById(req.params.id);
    if (!team) return fail(res, 404, "Team not found.");

    team.discussion.push({ sender: req.user._id, text });
    await team.save();
    return ok(res, 201, { team });
  } catch (err) {
    next(err);
  }
}

module.exports = { createTeam, getTeam, inviteMember, addTask, updateTask, postMessage };