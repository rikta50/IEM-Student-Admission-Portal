
const fs = require('fs');
const path = require('path');

const { Op } = require('sequelize');

const {
  sequelize
} = require('../config/database');

const {
  Application,
  User,
  Department,
  PersonalDetails,
  AcademicDetails,
  DepartmentPreference,
  Document,
  ApplicationStatusHistory
} = require('../models/sqlite');

const {
  APPLICATION_STATUS,
  DOCUMENT_TYPES,
  ROLES,
  ACTIVE_ADMISSION_CYCLE
} = require('../config/constants');

const { generateApplicationNumber } = require('../utils/appNumberGenerator');
const { successResponse, errorResponse } = require('../utils/apiResponse');


// --------------------------------------------------
// HELPER: Remove uploaded file safely
// --------------------------------------------------

const removeFile = (filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (error) {
      console.warn(`[File Warning] Could not remove file: ${filePath}`);
    }
  }
};


// --------------------------------------------------
// HELPER: Retrieve application with all associations
// --------------------------------------------------

const getApplicationDetails = async (applicationId, transaction = null) => {
  return Application.findByPk(applicationId, {
    include: [
      {
        model: User,
        as: 'applicant',
        attributes: ['id', 'fullName', 'email', 'phone', 'role']
      },
      {
        model: Department,
        as: 'assignedDepartment',
        attributes: ['id', 'code', 'name', 'degree']
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
        model: Document,
        as: 'documents'
      },
      {
        model: ApplicationStatusHistory,
        as: 'auditHistory'
      }
    ],
    order: [
      [{ model: DepartmentPreference, as: 'departmentPreferences' }, 'priority', 'ASC'],
      [{ model: ApplicationStatusHistory, as: 'auditHistory' }, 'changedAt', 'ASC']
    ],
    transaction
  });
};


// --------------------------------------------------
// HELPER: Map original nested personal details
// into SQLite columns
// --------------------------------------------------

const mapPersonalDetails = (data) => {
  const permanent = data.address?.permanent || {};
  const current = data.address?.current || {};

  const allowedFields = [
    'dob',
    'gender',
    'category',
    'bloodGroup',
    'guardianName',
    'guardianPhone'
  ];

  const result = {};

  allowedFields.forEach((field) => {
    if (data[field] !== undefined) {
      result[field] = data[field];
    }
  });

  const addressMapping = {
    permanentAddressLine1: permanent.line1,
    permanentCity: permanent.city,
    permanentState: permanent.state,
    permanentPincode: permanent.pincode,
    currentAddressLine1: current.line1,
    currentCity: current.city,
    currentState: current.state,
    currentPincode: current.pincode
  };

  Object.entries(addressMapping).forEach(([field, value]) => {
    if (value !== undefined) {
      result[field] = value;
    }
  });

  // Also support already flattened SQLite-style input.
  const flatFields = [
    'permanentAddressLine1',
    'permanentCity',
    'permanentState',
    'permanentPincode',
    'currentAddressLine1',
    'currentCity',
    'currentState',
    'currentPincode'
  ];

  flatFields.forEach((field) => {
    if (data[field] !== undefined) {
      result[field] = data[field];
    }
  });

  return result;
};


// --------------------------------------------------
// HELPER: Map original nested academic details
// into SQLite columns
// --------------------------------------------------

const mapAcademicDetails = (data) => {
  const class10 = data.class10 || {};
  const class12 = data.class12 || {};
  const entranceExam = data.entranceExam || {};

  const mapping = {
    class10Board: class10.board,
    class10PassingYear: class10.passingYear,
    class10Percentage: class10.percentage,

    class12Board: class12.board,
    class12PassingYear: class12.passingYear,
    class12Stream: class12.stream,
    class12AggregatePercentage: class12.aggregatePercentage,

    entranceExamType: entranceExam.examType,
    entranceExamRollNumber: entranceExam.rollNumber,
    entranceExamRank: entranceExam.rank
  };

  const result = {};

  Object.entries(mapping).forEach(([field, value]) => {
    if (value !== undefined) {
      result[field] = value;
    }
  });

  // Support already flattened SQLite-style input.
  Object.keys(mapping).forEach((field) => {
    if (data[field] !== undefined) {
      result[field] = data[field];
    }
  });

  return result;
};


// --------------------------------------------------
// GET OR INITIALIZE STUDENT APPLICATION
// GET /api/v1/applications/my-application
// --------------------------------------------------

const getMyApplication = async (req, res) => {
  try {
    const admissionCycle = ACTIVE_ADMISSION_CYCLE;

    let application = await Application.findOne({
      where: {
        applicantId: req.user.id,
        admissionCycle
      }
    });

    if (!application) {
      application = await Application.create({
        applicantId: req.user.id,
        admissionCycle,
        status: APPLICATION_STATUS.DRAFT
      });
    }

    const applicationDetails = await getApplicationDetails(application.id);

    return successResponse(
      res,
      200,
      'Application retrieved successfully.',
      applicationDetails
    );
  } catch (error) {
    console.error('[Get My Application Error]', error);

    return errorResponse(
      res,
      500,
      'Server error occurred while retrieving application.'
    );
  }
};


// --------------------------------------------------
// SAVE / UPDATE APPLICATION DRAFT
// PUT /api/v1/applications/save-draft
// --------------------------------------------------

const saveDraft = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const admissionCycle = ACTIVE_ADMISSION_CYCLE;

    const application = await Application.findOne({
      where: {
        applicantId: req.user.id,
        admissionCycle
      },
      transaction
    });

    if (!application) {
      await transaction.rollback();

      return errorResponse(
        res,
        404,
        'Application record not found. Please initialize draft first.'
      );
    }

    if (application.status !== APPLICATION_STATUS.DRAFT) {
      await transaction.rollback();

      return errorResponse(
        res,
        403,
        `Cannot edit application. Status is "${application.status}". Submitted applications are locked.`
      );
    }

    const {
      personalDetails,
      academicDetails,
      departmentPreferences
    } = req.body;

    // Save personal details.
    if (personalDetails) {
      const personalData = mapPersonalDetails(personalDetails);

      await PersonalDetails.findOrCreate({
        where: { applicationId: application.id },
        defaults: {
          applicationId: application.id,
          ...personalData
        },
        transaction
      }).then(async ([record, created]) => {
        if (!created) {
          await record.update(personalData, { transaction });
        }
      });
    }

    // Save academic details.
    if (academicDetails) {
      const academicData = mapAcademicDetails(academicDetails);

      await AcademicDetails.findOrCreate({
        where: { applicationId: application.id },
        defaults: {
          applicationId: application.id,
          ...academicData
        },
        transaction
      }).then(async ([record, created]) => {
        if (!created) {
          await record.update(academicData, { transaction });
        }
      });
    }

    // Replace department preferences.
    if (Array.isArray(departmentPreferences)) {
      const preferences = departmentPreferences.map((item, index) => ({
        departmentId:
          item.department?.id ??
          item.departmentId ??
          item.department,
        priority: Number(item.priority || index + 1)
      }));

      const validPreferences = preferences.every(
        (item) =>
          Number.isInteger(Number(item.departmentId)) &&
          Number.isInteger(item.priority) &&
          item.priority >= 1
      );

      if (!validPreferences) {
        throw new Error('Invalid department preference data.');
      }

      const departmentIds = preferences.map((item) => Number(item.departmentId));

      if (new Set(departmentIds).size !== departmentIds.length) {
        throw new Error('Duplicate department preferences are not allowed.');
      }

      const priorities = preferences.map((item) => item.priority);

      if (new Set(priorities).size !== priorities.length) {
        throw new Error('Department preference priorities must be unique.');
      }

      if (departmentIds.length > 0) {
        const existingDepartments = await Department.count({
          where: {
            id: { [Op.in]: departmentIds },
            isActive: true
          },
          transaction
        });

        if (existingDepartments !== departmentIds.length) {
          throw new Error('One or more selected departments are invalid or inactive.');
        }
      }

      await DepartmentPreference.destroy({
        where: { applicationId: application.id },
        transaction
      });

      if (preferences.length > 0) {
        await DepartmentPreference.bulkCreate(
          preferences.map((item) => ({
            applicationId: application.id,
            departmentId: Number(item.departmentId),
            priority: item.priority
          })),
          { transaction }
        );
      }
    }

    await transaction.commit();

    const updatedApplication = await getApplicationDetails(application.id);

    return successResponse(
      res,
      200,
      'Application draft saved successfully.',
      updatedApplication
    );
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }

    console.error('[Save Draft Error]', error);

    return errorResponse(
      res,
      400,
      error.message || 'Server error occurred while saving draft.'
    );
  }
};


// --------------------------------------------------
// UPLOAD APPLICATION DOCUMENT
// POST /api/v1/applications/upload-document/:docType
// --------------------------------------------------

const uploadDocument = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { docType } = req.params;

    const validDocTypes = Object.values(DOCUMENT_TYPES);

    if (!validDocTypes.includes(docType)) {
      removeFile(req.file?.path);

      await transaction.rollback();

      return errorResponse(
        res,
        400,
        `Invalid document type "${docType}". Allowed types: ${validDocTypes.join(', ')}`
      );
    }

    if (!req.file) {
      await transaction.rollback();

      return errorResponse(
        res,
        400,
        'No document file uploaded.'
      );
    }

    let application = await Application.findOne({
      where: {
        applicantId: req.user.id,
        admissionCycle: ACTIVE_ADMISSION_CYCLE
      },
      transaction
    });

    if (!application) {
      application = await Application.create({
        applicantId: req.user.id,
        admissionCycle: ACTIVE_ADMISSION_CYCLE,
        status: APPLICATION_STATUS.DRAFT
      }, { transaction });
    }

    if (application.status !== APPLICATION_STATUS.DRAFT) {
      await transaction.rollback();
      removeFile(req.file.path);

      return errorResponse(
        res,
        403,
        'Application has already been submitted. Document changes are locked.'
      );
    }

    const oldDocument = await Document.findOne({
      where: {
        applicationId: application.id,
        docType
      },
      transaction
    });
    // Preserve the old file path before updating the Sequelize record.
const oldStoredPath = oldDocument ? oldDocument.storedPath : null;

    const documentData = {
      applicationId: application.id,
      docType,
      originalName: req.file.originalname,
      filename: req.file.filename,
      storedPath: req.file.path,
      mimetype: req.file.mimetype,
      sizeBytes: req.file.size,
      uploadedAt: new Date()
    };

    if (oldDocument) {
      await oldDocument.update(documentData, { transaction });
    } else {
      await Document.create(documentData, { transaction });
    }

    await transaction.commit();

    // Remove the previous file only after the database update succeeds.
if (oldStoredPath) {
  removeFile(oldStoredPath);
}
    return successResponse(
      res,
      200,
      `${docType} uploaded successfully.`,
      {
        docType,
        document: {
          originalName: documentData.originalName,
          filename: documentData.filename,
          mimetype: documentData.mimetype,
          sizeBytes: documentData.sizeBytes,
          uploadedAt: documentData.uploadedAt
        }
      }
    );
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }

    removeFile(req.file?.path);

    console.error('[Upload Document Error]', error);

    return errorResponse(
      res,
      500,
      'Server error occurred during document upload.'
    );
  }
};


// --------------------------------------------------
// SUBMIT FINAL APPLICATION
// POST /api/v1/applications/submit
// --------------------------------------------------

const submitApplication = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const application = await Application.findOne({
      where: {
        applicantId: req.user.id,
        admissionCycle: ACTIVE_ADMISSION_CYCLE
      },
      transaction
    });

    if (!application) {
      await transaction.rollback();

      return errorResponse(
        res,
        404,
        'Application not found. Please fill your application first.'
      );
    }

    if (application.status !== APPLICATION_STATUS.DRAFT) {
      await transaction.rollback();

      return errorResponse(
        res,
        400,
        `Application is already submitted (Status: ${application.status}, Application ID: ${application.applicationNumber}).`
      );
    }

    const [personal, academic, preferences, documents] = await Promise.all([
      PersonalDetails.findOne({
        where: { applicationId: application.id },
        transaction
      }),
      AcademicDetails.findOne({
        where: { applicationId: application.id },
        transaction
      }),
      DepartmentPreference.findAll({
        where: { applicationId: application.id },
        transaction
      }),
      Document.findAll({
        where: { applicationId: application.id },
        transaction
      })
    ]);

    const missing = [];

    if (!personal?.dob) missing.push('Personal Details: Date of Birth');
    if (!personal?.gender) missing.push('Personal Details: Gender');
    if (!personal?.guardianName) missing.push('Personal Details: Guardian Name');
    if (!personal?.guardianPhone) missing.push('Personal Details: Guardian Phone');

    if (!personal?.permanentCity || !personal?.permanentPincode) {
      missing.push('Personal Details: Permanent Address (City/Pincode)');
    }

    if (!academic?.class10Board || academic.class10Percentage == null) {
      missing.push('Academic Details: Class 10 Board and Percentage');
    }

    if (!academic?.class12Board || academic.class12AggregatePercentage == null) {
      missing.push('Academic Details: Class 12 Board and Aggregate Percentage');
    }

    if (!preferences || preferences.length === 0) {
      missing.push('Department Preferences: At least one preferred department');
    }

    const uploadedTypes = documents.map((document) => document.docType);

    if (!uploadedTypes.includes('photo')) {
      missing.push('Documents: Student Photograph');
    }

    if (!uploadedTypes.includes('marksheet10')) {
      missing.push('Documents: Class 10 Marksheet');
    }

    if (!uploadedTypes.includes('marksheet12')) {
      missing.push('Documents: Class 12 Marksheet');
    }

    if (missing.length > 0) {
      await transaction.rollback();

      return errorResponse(
        res,
        400,
        'Cannot submit application. Please complete the following required items:',
        missing
      );
    }

    const applicationNumber = await generateApplicationNumber(
      application.admissionCycle
    );

    const previousStatus = application.status;

    await application.update({
      applicationNumber,
      status: APPLICATION_STATUS.SUBMITTED,
      submittedAt: new Date()
    }, { transaction });

    await ApplicationStatusHistory.create({
      applicationId: application.id,
      action: 'APPLICATION_SUBMITTED',
      changedById: req.user.id,
      previousStatus,
      newStatus: APPLICATION_STATUS.SUBMITTED,
      remarks: 'Application completed and submitted by applicant.',
      changedAt: new Date()
    }, { transaction });

    await transaction.commit();

    const submittedApplication = await getApplicationDetails(application.id);

    return successResponse(
      res,
      200,
      'Application submitted successfully! Your application is now locked.',
      {
        applicationNumber,
        status: submittedApplication.status,
        submittedAt: submittedApplication.submittedAt,
        application: submittedApplication
      }
    );
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }

    console.error('[Submit Application Error]', error);

    return errorResponse(
      res,
      500,
      'Server error occurred during application submission.'
    );
  }
};


// --------------------------------------------------
// SECURE DOCUMENT STREAMING
// GET /api/v1/applications/:id/documents/:docType
// --------------------------------------------------

const getDocument = async (req, res) => {
  try {
    const { id, docType } = req.params;

    if (!/^\d+$/.test(id)) {
      return errorResponse(res, 400, 'Invalid application ID.');
    }

    const application = await Application.findByPk(Number(id));

    if (!application) {
      return errorResponse(res, 404, 'Application not found.');
    }

    const isOwner = Number(application.applicantId) === Number(req.user.id);
    const isAdmin = req.user.role === ROLES.ADMIN;

    if (!isOwner && !isAdmin) {
      return errorResponse(
        res,
        403,
        'Access denied: You do not have permission to view this document.'
      );
    }

    const document = await Document.findOne({
      where: {
        applicationId: application.id,
        docType
      }
    });

    if (!document) {
      return errorResponse(
        res,
        404,
        `No ${docType} has been uploaded for this application.`
      );
    }

    const resolvedPath = path.resolve(document.storedPath);

    if (!fs.existsSync(resolvedPath)) {
      return errorResponse(
        res,
        404,
        'Document file not found on server storage.'
      );
    }

    res.setHeader('Content-Type', document.mimetype);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${path.basename(document.originalName)}"`
    );

    return res.sendFile(resolvedPath);
  } catch (error) {
    console.error('[Get Document Error]', error);

    return errorResponse(
      res,
      500,
      'Server error occurred while streaming document.'
    );
  }
};


// --------------------------------------------------
// EXPORT CONTROLLER FUNCTIONS
// --------------------------------------------------

module.exports = {
  getMyApplication,
  saveDraft,
  uploadDocument,
  submitApplication,
  getDocument
};
