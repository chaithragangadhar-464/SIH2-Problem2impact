const { fail } = require("../utils/responseFormatter");

function notFound(req, res, next) {
  fail(res, 404, `Route not found: ${req.method} ${req.originalUrl}`);
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error("[error]", err);

  if (err.name === "ValidationError") {
    return fail(res, 400, "Validation failed", Object.values(err.errors).map((e) => e.message));
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    return fail(res, 409, `${field} already exists.`);
  }

  if (err.name === "CastError") {
    return fail(res, 400, `Invalid ${err.path}: ${err.value}`);
  }

  if (err.name === "MulterError") {
    return fail(res, 400, `Upload error: ${err.message}`);
  }

  const status = err.statusCode || 500;
  return fail(res, status, err.message || "Internal server error");
}

module.exports = { notFound, errorHandler };