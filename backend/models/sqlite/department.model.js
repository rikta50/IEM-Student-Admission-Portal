
const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const Department = sequelize.define('Department', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },

  code: {
    type: DataTypes.STRING(30),
    allowNull: false,
    unique: true,
    set(value) {
      this.setDataValue('code', value.trim().toUpperCase());
    },
    validate: {
      notEmpty: true
    }
  },

  name: {
    type: DataTypes.STRING(150),
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },

  campus: {
    type: DataTypes.ENUM('Salt Lake', 'New Town'),
    allowNull: false
  },

  degree: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'B.Tech'
  },

  programmeLevel: {
    type: DataTypes.ENUM('UG', 'PG', 'Integrated'),
    allowNull: false,
    defaultValue: 'UG'
  },

  intakeCapacity: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null,
    validate: {
      min: 1
    }
  },

  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }

}, {
  tableName: 'departments',
  timestamps: true
});

module.exports = Department;

