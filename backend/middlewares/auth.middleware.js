/**
 * Authentication Middleware
 * Validates JSON Web Token (JWT) from Authorization Bearer header
 */

const jwt = require('jsonwebtoken');
const { errorResponse } = require('../utils/apiResponse');

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return errorResponse(res, 401, 'Authentication token missing or invalid format. Please log in.');
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return errorResponse(res, 401, 'Authentication token not provided.');
  }

  try {
    const jwtSecret = process.env.JWT_SECRET || 'iem_admission_secret_key_btech_se_lab_2025_secure_token';
    const decoded = jwt.verify(token, jwtSecret);

    // Attach decoded user information to request object
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role
    };

    return next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return errorResponse(res, 401, 'Your session has expired. Please log in again.');
    }
    return errorResponse(res, 401, 'Invalid authentication token. Authorization denied.');
  }
};

module.exports = {
  verifyToken
};

