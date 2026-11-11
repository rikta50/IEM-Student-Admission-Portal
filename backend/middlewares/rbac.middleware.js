/**
 * Role-Based Access Control (RBAC) Middleware
 * Enforces role authorization on protected endpoints
 */

const { errorResponse } = require('../utils/apiResponse');

/**
 * Middleware factory that accepts allowed roles
 * @param  {...string} allowedRoles Roles permitted to access the endpoint ('admin', 'student')
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return errorResponse(res, 401, 'Unauthorized: User authentication required.');
    }

    if (!allowedRoles.includes(req.user.role)) {
      return errorResponse(
        res,
        403,
        `Access denied: This operation requires one of the following roles: [${allowedRoles.join(', ')}]. Current role: [${req.user.role}].`
      );
    }

    return next();
  };
};

module.exports = {
  requireRole
};

