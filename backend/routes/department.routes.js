/**
 * Department Routes
 * Mounted at: /api/v1/departments
 */

const express = require('express');
const router = express.Router();
const departmentController = require('../controllers/department.controller');

// Public endpoint to retrieve active departments
router.get('/', departmentController.getDepartments);

module.exports = router;

