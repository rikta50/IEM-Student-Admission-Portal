
const { sequelize, connectSQLite } = require('../config/database');
const { QueryTypes } = require('sequelize');

async function verifyDatabase() {
  try {
    await connectSQLite();

    const tables = await sequelize.query(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
      { type: QueryTypes.SELECT }
    );

    console.log('\n========== DATABASE VERIFICATION ==========');
    console.table(tables);
    console.log('Total tables:', tables.length);

    if (tables.length === 8) {
      console.log('SUCCESS: All 8 tables are present.');
    } else {
      console.log('WARNING: Expected 8 tables.');
    }

  } catch (error) {
    console.error('Verification failed:', error.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

verifyDatabase();
