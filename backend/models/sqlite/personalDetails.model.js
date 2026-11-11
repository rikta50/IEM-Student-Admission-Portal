
const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const PersonalDetails = sequelize.define('PersonalDetails', {
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

  dob: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },

  gender: {
    type: DataTypes.ENUM('Male', 'Female', 'Other'),
    allowNull: true
  },

  category: {
    type: DataTypes.ENUM('General', 'SC', 'ST', 'OBC-A', 'OBC-B', 'EWS'),
    allowNull: false,
    defaultValue: 'General'
  },

  bloodGroup: {
    type: DataTypes.STRING(5),
    allowNull: true
  },

  permanentAddressLine1: {
    type: DataTypes.STRING(255),
    allowNull: true
  },

  permanentCity: {
    type: DataTypes.STRING(100),
    allowNull: true
  },

  permanentState: {
    type: DataTypes.STRING(100),
    allowNull: true
  },

  permanentPincode: {
    type: DataTypes.STRING(10),
    allowNull: true
  },

  currentAddressLine1: {
    type: DataTypes.STRING(255),
    allowNull: true
  },

  currentCity: {
    type: DataTypes.STRING(100),
    allowNull: true
  },

  currentState: {
    type: DataTypes.STRING(100),
    allowNull: true
  },

  currentPincode: {
    type: DataTypes.STRING(10),
    allowNull: true
  },

  guardianName: {
    type: DataTypes.STRING(100),
    allowNull: true
  },

  guardianPhone: {
    type: DataTypes.STRING(10),
    allowNull: true
  }

}, {
  tableName: 'personal_details',
  timestamps: true
});

module.exports = PersonalDetails;
