/**
 * Minimal email service stub. Swap the internals for nodemailer + SMTP,
 * SendGrid, or AWS SES when you're ready to send real email — the call
 * sites elsewhere in the app won't need to change.
 */
async function sendEmail({ to, subject, text, html }) {
  console.log(`[email] -> ${to} | ${subject}`);
  console.log(`[email] body: ${text || html}`);
  // TODO: integrate real provider, e.g.:
  // await transporter.sendMail({ from: '"Problem2Impact" <no-reply@problem2impact.org>', to, subject, text, html });
  return { queued: true, to, subject };
}

async function sendWelcomeEmail(user) {
  return sendEmail({
    to: user.email,
    subject: "Welcome to Problem2Impact",
    text: `Hi ${user.name}, welcome aboard! Start exploring problems that match your skills.`,
  });
}

async function sendTeamInviteEmail(user, team, problemTitle) {
  return sendEmail({
    to: user.email,
    subject: `You've been invited to join a team on Problem2Impact`,
    text: `${user.name}, you've been invited to join "${team.name}" working on "${problemTitle}".`,
  });
}

async function sendFundingApprovedEmail(user, awardAmount, problemTitle) {
  return sendEmail({
    to: user.email,
    subject: "Your solution was funded! 🎉",
    text: `Congratulations ${user.name}! Your team's solution for "${problemTitle}" was finalized and awarded ₹${awardAmount}.`,
  });
}

module.exports = { sendEmail, sendWelcomeEmail, sendTeamInviteEmail, sendFundingApprovedEmail };