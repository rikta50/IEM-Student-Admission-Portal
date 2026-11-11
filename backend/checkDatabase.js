const { sequelize } = require('./config/database');

async function checkTables() {
  try {
    const [rows] = await sequelize.query(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'"
    );

    console.log('\nExisting database tables:');

    if (rows.length === 0) {
      console.log('No application tables found yet.');
    } else {
      console.table(rows);
    }
  } catch (error) {
    console.error('Database inspection failed:', error.message);
  } finally {
    await sequelize.close();
  }
}

checkTables();
