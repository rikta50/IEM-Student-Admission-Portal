
const { sequelize, connectSQLite } = require('../config/database');
const { QueryTypes } = require('sequelize');

async function inspectDepartments() {
  try {
    await connectSQLite();

    const columns = await sequelize.query(
      'PRAGMA table_info(departments)',
      { type: QueryTypes.SELECT }
    );

    const records = await sequelize.query(
      'SELECT * FROM departments',
      { type: QueryTypes.SELECT }
    );

    console.log('\n===== DEPARTMENT TABLE COLUMNS =====');
    console.table(columns);

    console.log('\n===== EXISTING DEPARTMENT RECORDS =====');
    console.log('Total records:', records.length);
    console.table(records);

  } catch (error) {
    console.error('Inspection error:', error.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

inspectDepartments();
