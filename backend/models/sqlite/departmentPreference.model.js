
const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const DepartmentPreference = sequelize.define('DepartmentPreference', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },

  applicationId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },

  departmentId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },

  priority: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1
    }
  }

}, {
  tableName: 'department_preferences',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['applicationId', 'priority']
    },
    {
      unique: true,
      fields: ['applicationId', 'departmentId']
    }
  ]
});

module.exports = DepartmentPreference;

