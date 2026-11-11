const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const EntranceExam = sequelize.define('EntranceExam', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  admissionCycle: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true
  },
  feeAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  examDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  examTime: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  examCentre: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  examAddress: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  instructions: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  isPublished: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  createdById: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  tableName: 'entrance_exams',
  timestamps: true
});

module.exports = EntranceExam;
