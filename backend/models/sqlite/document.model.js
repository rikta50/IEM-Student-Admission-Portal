
const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const Document = sequelize.define('Document', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },

  applicationId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },

  docType: {
    type: DataTypes.ENUM(
      'photo',
      'signature',
      'marksheet10',
      'marksheet12',
      'rankCard'
    ),
    allowNull: false
  },

  originalName: {
    type: DataTypes.STRING(255),
    allowNull: false
  },

  filename: {
    type: DataTypes.STRING(255),
    allowNull: false
  },

  storedPath: {
    type: DataTypes.STRING(500),
    allowNull: false
  },

  mimetype: {
    type: DataTypes.ENUM(
      'application/pdf',
      'image/jpeg',
      'image/png'
    ),
    allowNull: false
  },

  sizeBytes: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 5 * 1024 * 1024
    }
  },

  uploadedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }

}, {
  tableName: 'documents',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['applicationId', 'docType']
    }
  ]
});

module.exports = Document;
