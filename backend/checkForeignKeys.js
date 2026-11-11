const { sequelize, connectSQLite } = require('./config/database');
const { QueryTypes } = require('sequelize');

async function verifyForeignKeys() {
  try {
    await connectSQLite();

    const rows = await sequelize.query(
      'PRAGMA foreign_keys',
      { type: QueryTypes.SELECT }
    );

    console.log('\nForeign key enforcement:',
      rows[0]?.foreign_keys === 1 ? 'ENABLED' : 'DISABLED'
    );

    console.log('Query result:', rows);
  } catch (error) {
    console.error('Verification error:', error.message);
  } finally {
    await sequelize.close();
  }
}

verifyForeignKeys();
