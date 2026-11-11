/**
 * Application Routes
 * Mounted at: /api/v1/applications
 */

const express = require('express');
const router = express.Router();
const applicationController = require('../controllers/application.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/rbac.middleware');
const { uploadSingle } = require('../middlewares/upload.middleware');
const { ROLES } = require('../config/constants');

// Student Application Management Endpoints
router.get(
  '/my-application',
  verifyToken,
  requireRole(ROLES.STUDENT),
  applicationController.getMyApplication
);

router.put(
  '/save-draft',
  verifyToken,
  requireRole(ROLES.STUDENT),
  applicationController.saveDraft
);

router.post(
  '/upload-document/:docType',
  verifyToken,
  requireRole(ROLES.STUDENT),
  uploadSingle('file'),
  applicationController.uploadDocument
);

router.post(
  '/submit',
  verifyToken,
  requireRole(ROLES.STUDENT),
  applicationController.submitApplication
);

// Protected Document Streaming (Accessible to Applicant Owner or Administrators)
router.get(
  '/:id/documents/:docType',
  verifyToken,
  applicationController.getDocument
);

module.exports = router;

