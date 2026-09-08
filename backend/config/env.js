require("dotenv").config();

function required(name, fallback) {
  const val = process.env[name] ?? fallback;
  if (val === undefined) {
    console.error(`[env] Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return val;
}

module.exports = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || "development",
  MONGO_URI: required("MONGO_URI", "mongodb://localhost:27017/problem2impact"),
  JWT_SECRET: required("JWT_SECRET"),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  AI_SERVICE_URL: process.env.AI_SERVICE_URL || "http://localhost:8000",
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || "*",
  MAX_UPLOAD_MB: Number(process.env.MAX_UPLOAD_MB || 10),
};