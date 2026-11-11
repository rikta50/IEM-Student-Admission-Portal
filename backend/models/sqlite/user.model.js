
const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');
const { ROLES } = require('../../config/constants');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },

  fullName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 100]
    }
  },

  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    },
    set(value) {
      this.setDataValue('email', value.trim().toLowerCase());
    }
  },

  password: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [6, 255]
    }
  },

  phone: {
    type: DataTypes.STRING(10),
    allowNull: false,
    validate: {
      is: /^[0-9]{10}$/
    }
  },

  role: {
    type: DataTypes.ENUM(ROLES.STUDENT, ROLES.ADMIN),
    allowNull: false,
    defaultValue: ROLES.STUDENT
  },

  resetPasswordToken: {
    type: DataTypes.STRING,
    allowNull: true
  },

  resetPasswordExpires: {
    type: DataTypes.DATE,
    allowNull: true
  }

}, {
  tableName: 'users',
  timestamps: true
});

module.exports = User;
