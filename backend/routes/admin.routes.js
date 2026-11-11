/**
 * Administrator Routes
 * Mounted at: /api/v1/admin
 * RBAC: All endpoints strictly require ADMIN role
 */

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const entranceExamController = require('../controllers/entranceExam.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/rbac.middleware');
const { ROLES } = require('../config/constants');

// Apply verifyToken and requireRole(ADMIN) across all admin routes
router.use(verifyToken, requireRole(ROLES.ADMIN));

// Application Listing & Search/Filter
router.get('/applications', adminController.getApplications);

// Application Detail View
router.get('/applications/:id', adminController.getApplicationById);

// Status Workflow Transition (Under Review, Selected, Rejected)
router.patch('/applications/:id/status', adminController.updateApplicationStatus);

// Real-Time SQLite Analytics & Statistics
router.get('/statistics', adminController.getStatistics);

// Administrator CSV Export
router.get('/export-csv', adminController.exportApplicationsCsv);


// Entrance Examination Management
router.get('/entrance-exam', entranceExamController.getAdminExam);
router.put('/entrance-exam', entranceExamController.saveAdminExam);
router.get('/entrance-exam/registrations', entranceExamController.getAdminRegistrations);
module.exports = router;

