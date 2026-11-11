const express = require('express');
const router = express.Router();

const entranceExamController = require('../controllers/entranceExam.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/rbac.middleware');
const { ROLES } = require('../config/constants');

// All student entrance exam routes require student authentication.
router.use(verifyToken, requireRole(ROLES.STUDENT));

router.get('/my-status', entranceExamController.getStudentExam);
router.post('/pay-demo', entranceExamController.payDemo);

module.exports = router;
