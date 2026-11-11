
const { sequelize, connectSQLite } = require('../config/database');
const { Department } = require('../models/sqlite');
const { QueryTypes } = require('sequelize');

async function verifyDepartments() {
  try {
    await connectSQLite();

    const total = await Department.count();

    const campusCounts = await sequelize.query(
      `SELECT campus, COUNT(*) AS total
       FROM departments
       GROUP BY campus
       ORDER BY campus`,
      { type: QueryTypes.SELECT }
    );

    const missingCapacity = await Department.count({
      where: { intakeCapacity: null }
    });

    const duplicateCodes = await sequelize.query(
      `SELECT code, COUNT(*) AS total
       FROM departments
       GROUP BY code
       HAVING COUNT(*) > 1`,
      { type: QueryTypes.SELECT }
    );

    console.log('\n===== DEPARTMENT DATABASE VERIFICATION =====');
    console.log('Total programmes:', total);
    console.log('\nCampus-wise counts:');
    console.table(campusCounts);
    console.log('Programmes with unconfirmed intake capacity:', missingCapacity);
    console.log('Duplicate programme codes:', duplicateCodes.length);

    if (total !== 28 || duplicateCodes.length !== 0) {
      throw new Error('Department verification failed.');
    }

    console.log('\nDepartment verification PASSED!');
  } catch (error) {
    console.error('\nVerification failed:', error.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

verifyDepartments();
