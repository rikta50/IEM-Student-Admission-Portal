
const { sequelize, connectSQLite } = require('../config/database');
const Department = require('../models/sqlite/department.model');

async function migrateDepartments() {
  try {
    console.log('\n======================================');
    console.log(' DEPARTMENT TABLE MIGRATION');
    console.log('======================================\n');

    await connectSQLite();

    // Confirm that the existing table is empty.
    const [records] = await sequelize.query(
      'SELECT COUNT(*) AS total FROM departments'
    );

    if (Number(records[0].total) !== 0) {
      throw new Error(
        'Department table is not empty. Migration stopped to protect existing records.'
      );
    }

    console.log('Existing department records: 0');
    console.log('Removing the old empty departments table...');

    await sequelize.getQueryInterface().dropTable('departments');

    console.log('Old table removed successfully.');
    console.log('Creating the updated departments table...');

    await Department.sync();

    console.log('Updated departments table created successfully.');

    const columns = await sequelize.query(
      'PRAGMA table_info(departments)',
      { type: require('sequelize').QueryTypes.SELECT }
    );

    console.log('\nUpdated department table columns:');
    console.table(columns);

    console.log('\nDepartment schema migration completed successfully!');
  } catch (error) {
    console.error('\nDepartment migration failed:', error.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

migrateDepartments();
