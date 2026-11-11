/**
 * Authentication Routes
 * Mounted at: /api/v1/auth
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const {
  validate,
  registerValidation,
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation
} = require('../middlewares/validation.middleware');
const { verifyToken } = require('../middlewares/auth.middleware');
const { forgotPasswordLimiter } = require('../middlewares/rateLimit.middleware');

// Public endpoints
router.post('/register', validate(registerValidation), authController.register);
router.post('/login', validate(loginValidation), authController.login);
router.post('/forgot-password', forgotPasswordLimiter, validate(forgotPasswordValidation), authController.forgotPassword);
router.post('/reset-password', validate(resetPasswordValidation), authController.resetPassword);

// Authenticated endpoint
router.get('/me', verifyToken, authController.getMe);

module.exports = router;

