const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const EntranceExamRegistration = sequelize.define('EntranceExamRegistration', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  applicationId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true
  },
  applicantId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  admissionCycle: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  paymentStatus: {
    type: DataTypes.ENUM('Pending', 'Paid'),
    allowNull: false,
    defaultValue: 'Pending'
  },
  paymentMode: {
    type: DataTypes.STRING(30),
    allowNull: true
  },
  demoPaymentReference: {
    type: DataTypes.STRING(80),
    allowNull: true,
    unique: true
  },
  paidAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  hallTicketNumber: {
    type: DataTypes.STRING(60),
    allowNull: true,
    unique: true
  }
}, {
  tableName: 'entrance_exam_registrations',
  timestamps: true
});

module.exports = EntranceExamRegistration;
