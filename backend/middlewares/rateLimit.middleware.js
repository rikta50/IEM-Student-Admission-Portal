/**
 * Rate Limiting Middleware
 * Protects authentication and password recovery endpoints against brute-force attacks
 */

const rateLimit = require('express-rate-limit');
const { errorResponse } = require('../utils/apiResponse');

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Max 10 password reset requests per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return errorResponse(
      res,
      429,
      'Too many password reset requests from this IP address. Please try again after 15 minutes.'
    );
  }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Max 20 authentication attempts per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return errorResponse(
      res,
      429,
      'Too many requests. Please wait a few moments before trying again.'
    );
  }
});

module.exports = {
  forgotPasswordLimiter,
  authLimiter
};

