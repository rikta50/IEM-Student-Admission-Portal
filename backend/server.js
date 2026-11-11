/**
 * IEM Student Admission Portal - Backend Server
 * Database: SQLite with Sequelize
 */

const path = require('path');

require('dotenv').config({
  path: path.join(__dirname, '.env')
});

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const { connectSQLite, sequelize } = require('./config/database');

// Register all SQLite models and associations before syncing.
require('./models/sqlite');

const app = express();
const PORT = process.env.PORT || 5000;

// Security and utility middleware
app.use(helmet());

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:4200',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

app.use(morgan('dev'));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Connect to the configured database before handling API requests.
let databaseConnection;

app.use(async (req, res, next) => {
  try {
    if (!databaseConnection) {
      databaseConnection = connectSQLite().catch((error) => {
        databaseConnection = null;
        throw error;
      });
    }

    await databaseConnection;
    next();
  } catch (error) {
    console.error('[Database Middleware]', error.message);
    res.status(503).json({
      success: false,
      message: 'Database connection unavailable.'
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'IEM Student Admission Portal API is running smoothly',
    database: 'SQLite',
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api/v1/auth', require('./routes/auth.routes'));
app.use('/api/v1/departments', require('./routes/department.routes'));
app.use('/api/v1/applications', require('./routes/application.routes'));
app.use('/api/v1/entrance-exam', require('./routes/entranceExam.routes'));
app.use('/api/v1/admin', require('./routes/admin.routes'));

// Centralized error handling
app.use((err, req, res, next) => {
  console.error(`[Error] ${err.message}`, err.stack);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// Start server only after SQLite connects successfully
const startServer = async () => {
  try {
    await connectSQLite();

    // Ensure registered models have corresponding tables.
    // This does not automatically alter existing table structures.
    await sequelize.sync({ alter: false, force: false });

    const server = app.listen(PORT, () => {
      console.log(`[Server] Backend listening on port ${PORT}`);
      console.log(`[Server] Database: SQLite`);
      console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    return server;
  } catch (error) {
    console.error(`[Server] Failed to start: ${error.message}`);
    process.exitCode = 1;
    throw error;
  }
};

if (require.main === module) {
  startServer().catch(() => {
    // The error has already been logged.
  });
}

module.exports = { app, startServer };
