
/**
 * SQLite Department Controller
 * Provides active department and programme data.
 */

const { Department } = require('../models/sqlite');

const {
  successResponse,
  errorResponse
} = require('../utils/apiResponse');

const getDepartments = async (req, res) => {
  try {
    const departments = await Department.findAll({
      where: {
        isActive: true
      },
      attributes: [
        'id',
        'code',
        'name',
        'campus',
        'degree',
        'programmeLevel',
        'intakeCapacity',
        'isActive'
      ],
      order: [
        ['campus', 'ASC'],
        ['name', 'ASC']
      ]
    });

    return successResponse(
      res,
      200,
      'Departments retrieved successfully.',
      departments
    );

  } catch (error) {
    console.error('[Department Controller Error]', error);

    return errorResponse(
      res,
      500,
      'Server error occurred while retrieving departments.'
    );
  }
};

module.exports = {
  getDepartments
};
