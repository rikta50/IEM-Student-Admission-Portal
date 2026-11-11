
const crypto = require('crypto');
const { sequelize } = require('../config/database');

const {
  Application,
  User,
  EntranceExam,
  EntranceExamRegistration
} = require('../models/sqlite');

const {
  APPLICATION_STATUS,
  ACTIVE_ADMISSION_CYCLE
} = require('../config/constants');

const {
  successResponse,
  errorResponse
} = require('../utils/apiResponse');

const getAdminExam = async (req, res) => {
  try {
    const exam = await EntranceExam.findOne({
      where: { admissionCycle: ACTIVE_ADMISSION_CYCLE }
    });

    return successResponse(res, 200, 'Entrance examination settings retrieved.', exam);
  } catch (error) {
    console.error('[Get Admin Exam]', error);
    return errorResponse(res, 500, 'Unable to retrieve examination settings.');
  }
};

const saveAdminExam = async (req, res) => {
  try {
    const {
      feeAmount,
      examDate,
      examTime,
      examCentre,
      examAddress,
      instructions,
      isPublished
    } = req.body;

    const fee = Number(feeAmount);

    if (!Number.isFinite(fee) || fee < 0 || fee > 1000000) {
      return errorResponse(res, 400, 'Enter a valid examination fee.');
    }

    if (
      !examDate ||
      !examTime ||
      !String(examCentre || '').trim()
    ) {
      return errorResponse(res, 400, 'Exam date, time and centre are required.');
    }

    const parsedDate = new Date(`${examDate}T00:00:00`);

    if (Number.isNaN(parsedDate.getTime())) {
      return errorResponse(res, 400, 'Enter a valid examination date.');
    }

    const values = {
      admissionCycle: ACTIVE_ADMISSION_CYCLE,
      feeAmount: fee,
      examDate,
      examTime: String(examTime).trim(),
      examCentre: String(examCentre).trim(),
      examAddress: String(examAddress || '').trim(),
      instructions: String(instructions || '').trim(),
      isPublished: Boolean(isPublished),
      createdById: req.user.id
    };

    const [exam] = await EntranceExam.findOrCreate({
      where: { admissionCycle: ACTIVE_ADMISSION_CYCLE },
      defaults: values
    });

    await exam.update(values);

    return successResponse(res, 200, 'Entrance examination settings saved.', exam);
  } catch (error) {
    console.error('[Save Admin Exam]', error);
    return errorResponse(res, 500, 'Unable to save examination settings.');
  }
};

const getStudentExam = async (req, res) => {
  try {
    const application = await Application.findOne({
      where: {
        applicantId: req.user.id,
        admissionCycle: ACTIVE_ADMISSION_CYCLE
      }
    });

    if (!application || application.status !== APPLICATION_STATUS.SELECTED) {
      return successResponse(res, 200, 'Entrance examination eligibility retrieved.', {
        eligible: false,
        message: 'Your application must be selected before you can register for the entrance examination.',
        exam: null,
        registration: null
      });
    }

    const exam = await EntranceExam.findOne({
      where: {
        admissionCycle: ACTIVE_ADMISSION_CYCLE,
        isPublished: true
      }
    });

    if (!exam) {
      return successResponse(res, 200, 'You are eligible. Examination schedule is not published yet.', {
        eligible: true,
        examPublished: false,
        exam: null,
        registration: null
      });
    }

    let registration = await EntranceExamRegistration.findOne({
      where: { applicationId: application.id }
    });

    if (!registration) {
      registration = await EntranceExamRegistration.create({
        applicationId: application.id,
        applicantId: req.user.id,
        admissionCycle: ACTIVE_ADMISSION_CYCLE,
        paymentStatus: 'Pending'
      });
    }

    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'fullName', 'email']
    });

    return successResponse(res, 200, 'Entrance examination details retrieved.', {
      eligible: true,
      examPublished: true,
      student: user,
      applicationNumber: application.applicationNumber,
      exam,
      registration
    });
  } catch (error) {
    console.error('[Get Student Exam]', error);
    return errorResponse(res, 500, 'Unable to retrieve entrance examination details.');
  }
};

const payDemo = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const application = await Application.findOne({
      where: {
        applicantId: req.user.id,
        admissionCycle: ACTIVE_ADMISSION_CYCLE
      },
      transaction
    });

    if (!application || application.status !== APPLICATION_STATUS.SELECTED) {
      await transaction.rollback();
      return errorResponse(res, 403, 'Only selected applicants are eligible for exam payment.');
    }

    const exam = await EntranceExam.findOne({
      where: {
        admissionCycle: ACTIVE_ADMISSION_CYCLE,
        isPublished: true
      },
      transaction
    });

    if (!exam) {
      await transaction.rollback();
      return errorResponse(res, 400, 'The examination schedule has not been published.');
    }

    let registration = await EntranceExamRegistration.findOne({
      where: { applicationId: application.id },
      transaction
    });

    if (registration && registration.paymentStatus === 'Paid') {
      await transaction.rollback();
      return errorResponse(res, 409, 'Demo payment has already been completed.');
    }

    if (!registration) {
      registration = await EntranceExamRegistration.create({
        applicationId: application.id,
        applicantId: req.user.id,
        admissionCycle: ACTIVE_ADMISSION_CYCLE,
        paymentStatus: 'Pending'
      }, { transaction });
    }

    const reference = `DEMO-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
    const hallTicketNumber = `IEM-${ACTIVE_ADMISSION_CYCLE.replace('-', '')}-${application.id}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    await registration.update({
      paymentStatus: 'Paid',
      paymentMode: 'DEMO',
      demoPaymentReference: reference,
      paidAt: new Date(),
      hallTicketNumber
    }, { transaction });

    await transaction.commit();

    return successResponse(res, 200, 'Demo payment successful. Hall ticket generated.', {
      paymentMode: 'DEMO',
      paymentStatus: 'Paid',
      demoPaymentReference: reference,
      paidAt: registration.paidAt,
      hallTicketNumber
    });
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }

    console.error('[Demo Exam Payment]', error);
    return errorResponse(res, 500, 'Demo payment could not be completed.');
  }
};

const getAdminRegistrations = async (req, res) => {
  try {
    const registrations = await EntranceExamRegistration.findAll({
      where: { admissionCycle: ACTIVE_ADMISSION_CYCLE },
      include: [{
        model: Application,
        as: 'application',
        attributes: ['id', 'applicationNumber', 'status'],
        include: [{
          model: User,
          as: 'applicant',
          attributes: ['id', 'fullName', 'email', 'phone']
        }]
      }],
      order: [['createdAt', 'DESC']]
    });

    return successResponse(res, 200, 'Exam registrations retrieved.', registrations);
  } catch (error) {
    console.error('[Admin Exam Registrations]', error);
    return errorResponse(res, 500, 'Unable to retrieve exam registrations.');
  }
};

module.exports = {
  getAdminExam,
  saveAdminExam,
  getStudentExam,
  payDemo,
  getAdminRegistrations
};
