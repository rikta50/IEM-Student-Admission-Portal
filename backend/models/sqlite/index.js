
const User = require('./user.model');
const Department = require('./department.model');
const Application = require('./application.model');
const PersonalDetails = require('./personalDetails.model');
const AcademicDetails = require('./academicDetails.model');
const DepartmentPreference = require('./departmentPreference.model');
const Document = require('./document.model');
const ApplicationStatusHistory = require('./applicationStatusHistory.model');
const EntranceExam = require('./entranceExam.model');
const EntranceExamRegistration = require('./entranceExamRegistration.model');

// User and Application
User.hasMany(Application, {
  foreignKey: 'applicantId',
  as: 'applications',
  onDelete: 'CASCADE'
});

Application.belongsTo(User, {
  foreignKey: 'applicantId',
  as: 'applicant'
});

// Department and Application
Department.hasMany(Application, {
  foreignKey: 'assignedDepartmentId',
  as: 'assignedApplications'
});

Application.belongsTo(Department, {
  foreignKey: 'assignedDepartmentId',
  as: 'assignedDepartment'
});

// Application and Personal Details
Application.hasOne(PersonalDetails, {
  foreignKey: 'applicationId',
  as: 'personalDetails',
  onDelete: 'CASCADE'
});

PersonalDetails.belongsTo(Application, {
  foreignKey: 'applicationId',
  as: 'application'
});

// Application and Academic Details
Application.hasOne(AcademicDetails, {
  foreignKey: 'applicationId',
  as: 'academicDetails',
  onDelete: 'CASCADE'
});

AcademicDetails.belongsTo(Application, {
  foreignKey: 'applicationId',
  as: 'application'
});

// Application and Department Preferences
Application.hasMany(DepartmentPreference, {
  foreignKey: 'applicationId',
  as: 'departmentPreferences',
  onDelete: 'CASCADE'
});

DepartmentPreference.belongsTo(Application, {
  foreignKey: 'applicationId',
  as: 'application'
});

// Department and Department Preferences
Department.hasMany(DepartmentPreference, {
  foreignKey: 'departmentId',
  as: 'preferences'
});

DepartmentPreference.belongsTo(Department, {
  foreignKey: 'departmentId',
  as: 'department'
});

// Application and Documents
Application.hasMany(Document, {
  foreignKey: 'applicationId',
  as: 'documents',
  onDelete: 'CASCADE'
});

Document.belongsTo(Application, {
  foreignKey: 'applicationId',
  as: 'application'
});

// Application and Status History
Application.hasMany(ApplicationStatusHistory, {
  foreignKey: 'applicationId',
  as: 'auditHistory',
  onDelete: 'CASCADE'
});

ApplicationStatusHistory.belongsTo(Application, {
  foreignKey: 'applicationId',
  as: 'application'
});

// Administrator and Status History
User.hasMany(ApplicationStatusHistory, {
  foreignKey: 'changedById',
  as: 'statusChanges'
});

ApplicationStatusHistory.belongsTo(User, {
  foreignKey: 'changedById',
  as: 'changedBy'
});


// Entrance Examination and Registrations
Application.hasOne(EntranceExamRegistration, {
  foreignKey: 'applicationId',
  as: 'entranceExamRegistration'
});

EntranceExamRegistration.belongsTo(Application, {
  foreignKey: 'applicationId',
  as: 'application'
});

User.hasMany(EntranceExamRegistration, {
  foreignKey: 'applicantId',
  as: 'entranceExamRegistrations'
});

EntranceExamRegistration.belongsTo(User, {
  foreignKey: 'applicantId',
  as: 'applicant'
});
module.exports = {
  User,
  Department,
  Application,
  PersonalDetails,
  AcademicDetails,
  DepartmentPreference,
  Document,
  ApplicationStatusHistory,
  EntranceExam,
  EntranceExamRegistration
};
