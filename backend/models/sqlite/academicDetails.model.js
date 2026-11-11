
const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const AcademicDetails = sequelize.define('AcademicDetails', {
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

  class10Board: {
    type: DataTypes.STRING(100),
    allowNull: true
  },

  class10PassingYear: {
    type: DataTypes.INTEGER,
    allowNull: true
  },

  class10Percentage: {
    type: DataTypes.FLOAT,
    allowNull: true,
    validate: {
      min: 0,
      max: 100
    }
  },

  class12Board: {
    type: DataTypes.STRING(100),
    allowNull: true
  },

  class12PassingYear: {
    type: DataTypes.INTEGER,
    allowNull: true
  },

  class12Stream: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'Science'
  },

  class12AggregatePercentage: {
    type: DataTypes.FLOAT,
    allowNull: true,
    validate: {
      min: 0,
      max: 100
    }
  },

  entranceExamType: {
    type: DataTypes.ENUM('WBJEE', 'JEE Main'),
    allowNull: true
  },

  entranceExamRollNumber: {
    type: DataTypes.STRING(50),
    allowNull: true
  },

  entranceExamRank: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1
    }
  }

}, {
  tableName: 'academic_details',
  timestamps: true
});

module.exports = AcademicDetails;
