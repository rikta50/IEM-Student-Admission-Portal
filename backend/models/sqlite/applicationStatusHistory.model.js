
const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');
const { APPLICATION_STATUS } = require('../../config/constants');

const ApplicationStatusHistory = sequelize.define(
  'ApplicationStatusHistory',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },

    applicationId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },

    action: {
      type: DataTypes.STRING(100),
      allowNull: false
    },

    changedById: {
      type: DataTypes.INTEGER,
      allowNull: true
    },

    previousStatus: {
      type: DataTypes.ENUM(...Object.values(APPLICATION_STATUS)),
      allowNull: true
    },

    newStatus: {
      type: DataTypes.ENUM(...Object.values(APPLICATION_STATUS)),
      allowNull: true
    },

    remarks: {
      type: DataTypes.TEXT,
      allowNull: true
    },

    changedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  },
  {
    tableName: 'application_status_history',
    timestamps: true
  }
);

module.exports = ApplicationStatusHistory;
