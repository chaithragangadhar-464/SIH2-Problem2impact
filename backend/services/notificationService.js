const Notification = require("../models/Notification");

async function notify({ user, type = "general", title, message = "", link = "" }) {
  return Notification.create({ user, type, title, message, link });
}

async function notifyMany(userIds, payload) {
  const docs = userIds.map((user) => ({ user, ...payload }));
  return Notification.insertMany(docs);
}

module.exports = { notify, notifyMany };