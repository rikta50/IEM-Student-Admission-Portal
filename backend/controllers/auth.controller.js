
/**
 * SQLite Authentication Controller
 * Handles student registration, login, profile retrieval,
 * forgot password and password reset.
 */

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');

const { User } = require('../models/sqlite');
const { ROLES } = require('../config/constants');

const {
  successResponse,
  errorResponse
} = require('../utils/apiResponse');

const {
  sendPasswordResetEmail
} = require('../utils/emailService');

// ==========================================
// JWT TOKEN GENERATION
// ==========================================

const generateToken = (user) => {
  const secret = process.env.JWT_SECRET;
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

  if (!secret) {
    throw new Error('JWT_SECRET is not configured in backend/.env');
  }

  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role
    },
    secret,
    { expiresIn }
  );
};

// ==========================================
// STUDENT REGISTRATION
// ==========================================

const register = async (req, res) => {
  try {
    const { fullName, email, password, phone } = req.body;

    if (
      !fullName?.trim() ||
      !email?.trim() ||
      !password ||
      !phone?.trim()
    ) {
      return errorResponse(res, 400, 'All registration fields are required.');
    }

    if (password.length < 6) {
      return errorResponse(res, 400, 'Password must contain at least 6 characters.');
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({
      where: { email: normalizedEmail }
    });

    if (existingUser) {
      return errorResponse(
        res,
        409,
        'An account with this email address already exists. Please log in.'
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Public registration always creates a student.
    const newUser = await User.create({
      fullName: fullName.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      phone: phone.trim(),
      role: ROLES.STUDENT
    });

    const token = generateToken(newUser);

    return successResponse(res, 201, 'Student registered successfully!', {
      token,
      user: {
        id: newUser.id,
        fullName: newUser.fullName,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role
      }
    });

  } catch (error) {
    console.error('[Auth Register Error]', error);

    if (error.name === 'SequelizeUniqueConstraintError') {
      return errorResponse(
        res,
        409,
        'An account with this email address already exists.'
      );
    }

    return errorResponse(
      res,
      500,
      'Server error occurred during student registration.'
    );
  }
};

// ==========================================
// LOGIN
// ==========================================

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password) {
      return errorResponse(res, 400, 'Email and password are required.');
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({
      where: { email: normalizedEmail }
    });

    if (!user) {
      return errorResponse(res, 401, 'Invalid email or password.');
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      user.password
    );

    if (!isPasswordValid) {
      return errorResponse(res, 401, 'Invalid email or password.');
    }

    const token = generateToken(user);

    return successResponse(res, 200, 'Login successful!', {
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    });

  } catch (error) {
    console.error('[Auth Login Error]', error);

    return errorResponse(
      res,
      500,
      'Server error occurred during login.'
    );
  }
};

// ==========================================
// GET CURRENT USER PROFILE
// ==========================================

const getMe = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: {
        exclude: ['password', 'resetPasswordToken', 'resetPasswordExpires']
      }
    });

    if (!user) {
      return errorResponse(res, 404, 'User profile not found.');
    }

    return successResponse(
      res,
      200,
      'User profile retrieved successfully.',
      {
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          role: user.role,
          createdAt: user.createdAt
        }
      }
    );

  } catch (error) {
    console.error('[Auth Me Error]', error);

    return errorResponse(
      res,
      500,
      'Server error occurred while retrieving user profile.'
    );
  }
};

// ==========================================
// FORGOT PASSWORD
// ==========================================

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email?.trim()) {
      return errorResponse(res, 400, 'Email address is required.');
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({
      where: { email: normalizedEmail }
    });

    if (!user) {
      return successResponse(
        res,
        200,
        'If an account with that email exists, password reset instructions have been generated.'
      );
    }

    const resetToken = crypto.randomBytes(32).toString('hex');

    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = new Date(
      Date.now() + 60 * 60 * 1000
    );

    await user.save();

    let emailResult = null;

    try {
      emailResult = await sendPasswordResetEmail({
        to: user.email,
        resetToken,
        candidateName: user.fullName
      });
    } catch (mailError) {
      console.warn(
        '[Forgot Password] Email dispatch failed:',
        mailError.message
      );
    }

    const responseData = {
      email: user.email,
      previewUrl: emailResult ? emailResult.previewUrl : null
    };

    // Expose the raw reset token only for local lab testing.
    if (process.env.NODE_ENV !== 'production') {
      responseData.resetToken = resetToken;
    }

    return successResponse(
      res,
      200,
      'Password reset instructions have been dispatched to your registered email address.',
      responseData
    );

  } catch (error) {
    console.error('[Forgot Password Error]', error);

    return errorResponse(
      res,
      500,
      'Server error occurred while requesting password reset.'
    );
  }
};

// ==========================================
// RESET PASSWORD
// ==========================================

const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token?.trim() || !password) {
      return errorResponse(
        res,
        400,
        'Reset token and new password are required.'
      );
    }

    if (password.length < 6) {
      return errorResponse(
        res,
        400,
        'Password must contain at least 6 characters.'
      );
    }

    const hashedToken = crypto
      .createHash('sha256')
      .update(token.trim())
      .digest('hex');

    const user = await User.findOne({
      where: {
        resetPasswordToken: hashedToken,
        resetPasswordExpires: {
          [Op.gt]: new Date()
        }
      }
    });

    if (!user) {
      return errorResponse(
        res,
        400,
        'Invalid or expired password reset token.'
      );
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;

    await user.save();

    return successResponse(
      res,
      200,
      'Password has been reset successfully! You can now log in with your new password.'
    );

  } catch (error) {
    console.error('[Reset Password Error]', error);

    return errorResponse(
      res,
      500,
      'Server error occurred while resetting password.'
    );
  }
};

// ==========================================
// EXPORTS
// ==========================================

module.exports = {
  register,
  login,
  getMe,
  forgotPassword,
  resetPassword,
  generateToken
};
