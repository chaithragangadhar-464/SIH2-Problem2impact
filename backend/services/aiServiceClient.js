const axios = require("axios");
const { AI_SERVICE_URL } = require("../config/env");

const client = axios.create({
  baseURL: AI_SERVICE_URL,
  timeout: 15000,
});

/**
 * Extracts domain + skill tags from a problem's description text.
 * POST /extract-skills  { text }
 */
async function extractSkills(text) {
  const { data } = await client.post("/extract-skills", { text });
  return data; // { domain, skills: [...] }
}

/**
 * Ranks candidate users against a problem statement using embeddings.
 * POST /match-teams  { problemText, skillsRequired, candidates: [{ userId, profileText }] }
 * Returns: [{ userId, matchScore }]
 */
async function matchTeams(problemText, skillsRequired, candidates) {
  const { data } = await client.post("/match-teams", {
    problemText,
    skillsRequired,
    candidates,
  });
  return data.matches || [];
}

/**
 * Validates a submitted solution against the problem statement + rubric.
 * POST /validate-solution { problemText, solutionText }
 * Returns: { isValid, similarityScore, flaggedReason }
 */
async function validateSolution(problemText, solutionText) {
  const { data } = await client.post("/validate-solution", { problemText, solutionText });
  return data;
}

/**
 * Compares a new problem against existing ones to flag likely duplicates.
 * POST /detect-duplicate { problemText, existing: [{ problemId, text }] }
 * Returns: [{ problemId, similarityScore }]
 */
async function detectDuplicate(problemText, existing) {
  const { data } = await client.post("/detect-duplicate", { problemText, existing });
  return data.duplicates || [];
}

/**
 * Generates a raw embedding vector for arbitrary text (used to cache profileEmbedding
 * / descriptionEmbedding so future matches are cheap).
 * POST /embed { text }
 */
async function embedText(text) {
  const { data } = await client.post("/embed", { text });
  return data.embedding || [];
}

module.exports = {
  extractSkills,
  matchTeams,
  validateSolution,
  detectDuplicate,
  embedText,
};