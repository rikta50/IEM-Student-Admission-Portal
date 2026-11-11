
const { Op } = require('sequelize');

const { sequelize } = require('../config/database');

const {
  User,
  Application,
  Department,
  PersonalDetails,
  AcademicDetails,
  DepartmentPreference,
  Document,
  ApplicationStatusHistory
} = require('../models/sqlite');

const {
  ROLES,
  APPLICATION_STATUS,
  ACTIVE_ADMISSION_CYCLE
} = require('../config/constants');

const { successResponse, errorResponse } = require('../utils/apiResponse');
const { generateCsv } = require('../utils/csvHelper');


// --------------------------------------------------
// COMMON ASSOCIATIONS
// --------------------------------------------------

const applicationIncludes = [
  {
    model: User,
    as: 'applicant',
    attributes: ['id', 'fullName', 'email', 'phone', 'createdAt']
  },
  {
    model: PersonalDetails,
    as: 'personalDetails'
  },
  {
    model: AcademicDetails,
    as: 'academicDetails'
  },
  {
    model: DepartmentPreference,
    as: 'departmentPreferences',
    include: [
      {
        model: Department,
        as: 'department',
        attributes: ['id', 'code', 'name', 'degree', 'intakeCapacity']
      }
    ]
  },
  {
    model: Department,
    as: 'assignedDepartment',
    attributes: ['id', 'code', 'name', 'degree']
  },
  {
    model: Document,
    as: 'documents'
  },
  {
    model: ApplicationStatusHistory,
    as: 'auditHistory',
    include: [
      {
        model: User,
        as: 'changedBy',
        attributes: ['id', 'fullName', 'email', 'role']
      }
    ]
  }
];


// --------------------------------------------------
// HELPER: GET FULL APPLICATION
// --------------------------------------------------

const getFullApplication = async (id, transaction = null) => {
  return Application.findByPk(id, {
    include: applicationIncludes,
    transaction
  });
};


// --------------------------------------------------
// 1. GET PAGINATED APPLICATIONS
// GET /api/v1/admin/applications
// --------------------------------------------------

const getApplications = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit || '10', 10))
    );

    const offset = (page - 1) * limit;

    const { status, department, search } = req.query;
    const admissionCycle = req.query.cycle || ACTIVE_ADMISSION_CYCLE;

    const where = {
      admissionCycle,
      status: {
        [Op.ne]: APPLICATION_STATUS.DRAFT
      }
    };

    if (status && Object.values(APPLICATION_STATUS).includes(status)) {
      where.status = status;
    }

    if (department) {
      const departmentId = Number(department);

      if (!Number.isInteger(departmentId) || departmentId <= 0) {
        return errorResponse(res, 400, 'Invalid department ID.');
      }

      where[Op.or] = [
        { assignedDepartmentId: departmentId },
        {
          '$departmentPreferences.departmentId$': departmentId
        }
      ];
    }

    if (search && search.trim()) {
      const searchTerm = search.trim();

      const matchingUsers = await User.findAll({
        where: {
          [Op.or]: [
            { fullName: { [Op.like]: `%${searchTerm}%` } },
            { email: { [Op.like]: `%${searchTerm}%` } },
            { phone: { [Op.like]: `%${searchTerm}%` } }
          ]
        },
        attributes: ['id']
      });

      const userIds = matchingUsers.map((user) => user.id);

      const searchConditions = [
        {
          applicationNumber: {
            [Op.like]: `%${searchTerm}%`
          }
        }
      ];

      if (userIds.length > 0) {
        searchConditions.push({
          applicantId: {
            [Op.in]: userIds
          }
        });
      }

      where[Op.and] = [
        {
          [Op.or]: searchConditions
        }
      ];
    }

    const { count, rows } = await Application.findAndCountAll({
      where,
      include: applicationIncludes,
      distinct: true,
      order: [['submittedAt', 'DESC']],
      offset,
      limit
    });

    return successResponse(
      res,
      200,
      'Applications retrieved successfully.',
      {
        applications: rows,
        pagination: {
          total: count,
          totalPages: Math.ceil(count / limit),
          currentPage: page,
          limit
        }
      }
    );
  } catch (error) {
    console.error('[Admin Get Applications Error]', error);

    return errorResponse(
      res,
      500,
      'Server error occurred while retrieving applications.'
    );
  }
};


// --------------------------------------------------
// 2. GET APPLICATION DETAILS BY ID
// GET /api/v1/admin/applications/:id
// --------------------------------------------------

const getApplicationById = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return errorResponse(res, 400, 'Invalid application ID.');
    }

    const application = await getFullApplication(id);

    if (!application) {
      return errorResponse(res, 404, 'Application not found.');
    }

    return successResponse(
      res,
      200,
      'Application details retrieved successfully.',
      application
    );
  } catch (error) {
    console.error('[Admin Get Application Detail Error]', error);

    return errorResponse(
      res,
      500,
      'Server error occurred while retrieving application details.'
    );
  }
};


// --------------------------------------------------
// 3. UPDATE APPLICATION STATUS
// --------------------------------------------------

const updateApplicationStatus = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const id = Number(req.params.id);
    const { status, remarks, assignedDepartment } = req.body;

    if (!Number.isInteger(id) || id <= 0) {
      await transaction.rollback();
      return errorResponse(res, 400, 'Invalid application ID.');
    }

    const application = await Application.findByPk(id, {
      include: [
        {
          model: DepartmentPreference,
          as: 'departmentPreferences',
          order: [['priority', 'ASC']]
        }
      ],
      transaction
    });

    if (!application) {
      await transaction.rollback();
      return errorResponse(res, 404, 'Application not found.');
    }

    const currentStatus = application.status;

    if (currentStatus === APPLICATION_STATUS.DRAFT) {
      await transaction.rollback();

      return errorResponse(
        res,
        400,
        'Cannot update status of an unsubmitted Draft application.'
      );
    }

    const allowedTransitions = {
      [APPLICATION_STATUS.SUBMITTED]: [
        APPLICATION_STATUS.UNDER_REVIEW
      ],
      [APPLICATION_STATUS.UNDER_REVIEW]: [
        APPLICATION_STATUS.SELECTED,
        APPLICATION_STATUS.REJECTED
      ],
      [APPLICATION_STATUS.SELECTED]: [
        APPLICATION_STATUS.UNDER_REVIEW
      ],
      [APPLICATION_STATUS.REJECTED]: [
        APPLICATION_STATUS.UNDER_REVIEW
      ]
    };

    if (
      !allowedTransitions[currentStatus] ||
      !allowedTransitions[currentStatus].includes(status)
    ) {
      await transaction.rollback();

      return errorResponse(
        res,
        400,
        `Invalid status transition from "${currentStatus}" to "${status}". Allowed next states: [${(
          allowedTransitions[currentStatus] || []
        ).join(', ')}]`
      );
    }

    let departmentToAssign = application.assignedDepartmentId;

    if (status === APPLICATION_STATUS.SELECTED) {
      if (assignedDepartment !== undefined && assignedDepartment !== null) {
        const departmentId = Number(assignedDepartment);

        if (!Number.isInteger(departmentId) || departmentId <= 0) {
          await transaction.rollback();
          return errorResponse(res, 400, 'Invalid assigned department ID.');
        }

        const deptExists = await Department.findOne({
          where: {
            id: departmentId,
            isActive: true
          },
          transaction
        });

        if (!deptExists) {
          await transaction.rollback();
          return errorResponse(res, 400, 'Invalid assigned department ID.');
        }

        departmentToAssign = departmentId;
      } else if (!departmentToAssign) {
        const preferences = await DepartmentPreference.findAll({
          where: {
            applicationId: application.id
          },
          order: [['priority', 'ASC']],
          transaction
        });

        if (preferences.length > 0) {
          departmentToAssign = preferences[0].departmentId;
        }
      }

      if (!departmentToAssign) {
        await transaction.rollback();

        return errorResponse(
          res,
          400,
          'Cannot select the applicant without assigning a department.'
        );
      }
    }

    await application.update(
      {
        status,
        statusRemarks: remarks || '',
        ...(status === APPLICATION_STATUS.SELECTED
          ? { assignedDepartmentId: departmentToAssign }
          : {})
      },
      { transaction }
    );

    await ApplicationStatusHistory.create(
      {
        applicationId: application.id,
        action: 'STATUS_UPDATE',
        changedById: req.user.id,
        previousStatus: currentStatus,
        newStatus: status,
        remarks:
          remarks ||
          `Status changed from ${currentStatus} to ${status} by Administrator.`,
        changedAt: new Date()
      },
      { transaction }
    );

    await transaction.commit();

    const updatedApplication = await getFullApplication(application.id);

    return successResponse(
      res,
      200,
      `Application status successfully updated to "${status}".`,
      updatedApplication
    );
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }

    console.error('[Admin Update Status Error]', error);

    return errorResponse(
      res,
      500,
      'Server error occurred while updating application status.'
    );
  }
};


// --------------------------------------------------
// 4. ADMIN DASHBOARD STATISTICS
// --------------------------------------------------

const getStatistics = async (req, res) => {
  try {
    const admissionCycle = req.query.cycle || ACTIVE_ADMISSION_CYCLE;

    const totalRegisteredStudents = await User.count({
      where: {
        role: ROLES.STUDENT
      }
    });

    const submittedWhere = {
      admissionCycle,
      status: {
        [Op.ne]: APPLICATION_STATUS.DRAFT
      }
    };

    const totalSubmittedApplications = await Application.count({
      where: submittedWhere
    });

    const rawStatusCounts = await Application.findAll({
      where: {
        admissionCycle
      },
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'total']
      ],
      group: ['status'],
      raw: true
    });

    const statusCounts = {
      draft: 0,
      submitted: 0,
      underReview: 0,
      selected: 0,
      rejected: 0,
      pending: 0
    };

    rawStatusCounts.forEach((item) => {
      const keyMap = {
        [APPLICATION_STATUS.DRAFT]: 'draft',
        [APPLICATION_STATUS.SUBMITTED]: 'submitted',
        [APPLICATION_STATUS.UNDER_REVIEW]: 'underReview',
        [APPLICATION_STATUS.SELECTED]: 'selected',
        [APPLICATION_STATUS.REJECTED]: 'rejected'
      };

      const key = keyMap[item.status];

      if (key) {
        statusCounts[key] = Number(item.total);
      }
    });

    statusCounts.pending =
      statusCounts.submitted + statusCounts.underReview;

    // Department-wise first-choice demand and entrance ranks.
    const applications = await Application.findAll({
      where: submittedWhere,
      include: [
        {
          model: DepartmentPreference,
          as: 'departmentPreferences',
          required: true,
          include: [
            {
              model: Department,
              as: 'department',
              attributes: ['id', 'code', 'name', 'intakeCapacity']
            }
          ]
        },
        {
          model: AcademicDetails,
          as: 'academicDetails',
          attributes: ['entranceExamRank']
        }
      ]
    });

    const demandMap = new Map();

    applications.forEach((application) => {
      const preferences = application.departmentPreferences || [];

      const firstPreference = preferences
        .slice()
        .sort((a, b) => a.priority - b.priority)[0];

      if (!firstPreference || !firstPreference.department) {
        return;
      }

      const department = firstPreference.department;
      const key = department.id;

      if (!demandMap.has(key)) {
        demandMap.set(key, {
          id: department.id,
          code: department.code,
          name: department.name,
          intakeCapacity: department.intakeCapacity,
          totalApplicants: 0,
          ranks: []
        });
      }

      const demand = demandMap.get(key);
      demand.totalApplicants += 1;

      const rank = application.academicDetails?.entranceExamRank;

      if (rank !== null && rank !== undefined && Number.isFinite(Number(rank))) {
        demand.ranks.push(Number(rank));
      }
    });

    const departmentDemand = Array.from(demandMap.values())
      .map((item) => {
        const ranks = item.ranks;

        return {
          id: item.id,
          code: item.code,
          name: item.name,
          intakeCapacity: item.intakeCapacity,
          totalApplicants: item.totalApplicants,
          avgRank:
            ranks.length > 0
              ? ranks.reduce((sum, rank) => sum + rank, 0) / ranks.length
              : null,
          bestRank:
            ranks.length > 0
              ? Math.min(...ranks)
              : null
        };
      })
      .sort((a, b) => b.totalApplicants - a.totalApplicants);

    return successResponse(
      res,
      200,
      'Live statistics computed successfully from SQLite.',
      {
        admissionCycle,
        totalRegisteredStudents,
        totalSubmittedApplications,
        statusCounts,
        departmentDemand
      }
    );
  } catch (error) {
    console.error('[Admin Analytics Error]', error);

    return errorResponse(
      res,
      500,
      'Server error occurred while computing analytics.'
    );
  }
};


// --------------------------------------------------
// HELPER: CSV ADDRESS FORMATTER
// --------------------------------------------------

const formatAddress = (details, prefix) => {
  if (!details) return '';

  const line1 = details[`${prefix}AddressLine1`] || '';
  const city = details[`${prefix}City`] || '';
  const state = details[`${prefix}State`] || '';
  const pincode = details[`${prefix}Pincode`] || '';

  return [line1, city, state, pincode]
    .filter(Boolean)
    .join(', ');
};


// --------------------------------------------------
// 5. EXPORT APPLICATIONS TO CSV
// --------------------------------------------------

const exportApplicationsCsv = async (req, res) => {
  try {
    const admissionCycle = req.query.cycle || ACTIVE_ADMISSION_CYCLE;
    const { status, department } = req.query;

    const where = {
      admissionCycle,
      status: {
        [Op.ne]: APPLICATION_STATUS.DRAFT
      }
    };

    if (status && Object.values(APPLICATION_STATUS).includes(status)) {
      where.status = status;
    }

    if (department) {
      const departmentId = Number(department);

      if (!Number.isInteger(departmentId) || departmentId <= 0) {
        return errorResponse(res, 400, 'Invalid department ID.');
      }

      where[Op.or] = [
        { assignedDepartmentId: departmentId },
        {
          '$departmentPreferences.departmentId$': departmentId
        }
      ];
    }

    const applications = await Application.findAll({
      where,
      include: applicationIncludes,
      order: [['submittedAt', 'DESC']],
      distinct: true
    });

    const headers = [
      'Student ID',
      'Application ID',
      'Student Name',
      'Email',
      'Phone Number',
      'Date of Birth',
      'Gender',
      'Category',
      'Permanent Address',
      'Current Address',
      'Class 10 Board',
      'Class 10 Percentage',
      'Class 10 Passing Year',
      'Class 12 Board',
      'Class 12 Percentage',
      'Class 12 Passing Year',
      'Entrance Exam Type',
      'Entrance Exam Rank',
      '1st Choice Department',
      'Assigned Department',
      'Application Status',
      'Status Remarks',
      'Registration Date',
      'Submission Date'
    ];

    const rows = applications.map((app) => {
      const user = app.applicant || {};
      const personal = app.personalDetails || {};
      const academic = app.academicDetails || {};

      const preferences = (app.departmentPreferences || [])
        .slice()
        .sort((a, b) => a.priority - b.priority);

      const firstChoice =
        preferences[0]?.department
          ? `${preferences[0].department.name} (${preferences[0].department.code})`
          : 'N/A';

      const assignedDepartment = app.assignedDepartment
        ? `${app.assignedDepartment.name} (${app.assignedDepartment.code})`
        : 'Pending Decision';

      return [
        user.id || '',
        app.applicationNumber || 'N/A',
        user.fullName || '',
        user.email || '',
        user.phone || '',
        personal.dob || '',
        personal.gender || '',
        personal.category || '',
        formatAddress(personal, 'permanent'),
        formatAddress(personal, 'current'),
        academic.class10Board || '',
        academic.class10Percentage ?? '',
        academic.class10PassingYear || '',
        academic.class12Board || '',
        academic.class12AggregatePercentage ?? '',
        academic.class12PassingYear || '',
        academic.entranceExamType || '',
        academic.entranceExamRank ?? '',
        firstChoice,
        assignedDepartment,
        app.status || '',
        app.statusRemarks || '',
        user.createdAt
          ? new Date(user.createdAt).toISOString().split('T')[0]
          : '',
        app.submittedAt
          ? new Date(app.submittedAt).toISOString().split('T')[0]
          : ''
      ];
    });

    const csvContent = generateCsv(headers, rows);

    const filename =
      `iem_admissions_${admissionCycle}_${Date.now()}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`
    );

    return res.status(200).send(csvContent);
  } catch (error) {
    console.error('[Admin CSV Export Error]', error);

    return errorResponse(
      res,
      500,
      'Server error occurred while exporting applications to CSV.'
    );
  }
};


// --------------------------------------------------
// EXPORT FUNCTIONS
// --------------------------------------------------

module.exports = {
  getApplications,
  getApplicationById,
  updateApplicationStatus,
  getStatistics,
  exportApplicationsCsv
};
