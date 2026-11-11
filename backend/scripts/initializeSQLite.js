
const { sequelize, connectSQLite } = require('../config/database');
const { QueryTypes } = require('sequelize');

// Load all eight models and their relationships
require('../models/sqlite');

const initializeSQLite = async () => {
  try {
    console.log('\n======================================');
    console.log(' IEM ADMISSION PORTAL - SQLITE SETUP');
    console.log('======================================\n');

    // Step 1: Connect to SQLite
    await connectSQLite();

    // Step 2: Create missing tables safely
    console.log('\nCreating database tables...');

    await sequelize.sync({
      alter: false,
      force: false
    });

    console.log('Database tables created successfully.');

    // Step 3: Display all application tables
    const tables = await sequelize.query(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
      { type: QueryTypes.SELECT }
    );

    console.log('\nDatabase tables:');

    tables.forEach((table, index) => {
      console.log(`${index + 1}. ${table.name}`);
    });

    // Step 4: Verify foreign-key integrity
    const foreignKeyErrors = await sequelize.query(
      'PRAGMA foreign_key_check',
      { type: QueryTypes.SELECT }
    );

    if (foreignKeyErrors.length === 0) {
      console.log('\nForeign-key integrity: PASSED');
    } else {
      console.error('\nForeign-key integrity errors:', foreignKeyErrors);
      throw new Error('Foreign-key integrity check failed.');
    }

    console.log('\nSQLite initialization completed successfully!');

  } catch (error) {
    console.error('\nSQLite initialization failed:', error.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
};

initializeSQLite();
