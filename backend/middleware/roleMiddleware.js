const { fail } = require("../utils/responseFormatter");

/**
 * Usage: router.get('/admin', protect, restrictTo('government', 'ngo', 'industry'), handler)
 */
function restrictTo(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return fail(res, 401, "Not authenticated.");
    }
    if (!allowedRoles.includes(req.user.role)) {
      return fail(res, 403, "You do not have permission to perform this action.");
    }
    next();
  };
}

module.exports = { restrictTo };