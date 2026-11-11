
const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');
const {
  APPLICATION_STATUS,
  ACTIVE_ADMISSION_CYCLE
} = require('../../config/constants');

const Application = sequelize.define('Application', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },

  applicationNumber: {
    type: DataTypes.STRING(50),
    allowNull: true,
    unique: true
  },

  admissionCycle: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: ACTIVE_ADMISSION_CYCLE
  },

  applicantId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },

  status: {
    type: DataTypes.ENUM(...Object.values(APPLICATION_STATUS)),
    allowNull: false,
    defaultValue: APPLICATION_STATUS.DRAFT
  },

  statusRemarks: {
    type: DataTypes.TEXT,
    allowNull: true
  },

  assignedDepartmentId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },

  submittedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'applications',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['applicantId', 'admissionCycle']
    }
  ]
});

module.exports = Application;
