/**
 * SQLite Database Configuration
 * IEM Student Admission Portal
 */

const { Sequelize } = require('sequelize');
const path = require('path');
const fs = require('fs');

const databaseDirectory = path.join(__dirname, '..', 'database');

if (!fs.existsSync(databaseDirectory)) {
    fs.mkdirSync(databaseDirectory, { recursive: true });
}

const databasePath = path.join(
    databaseDirectory,
    'iem_admission_portal.sqlite'
);

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: databasePath,
    logging: false
});

const connectSQLite = async () => {
    try {
        await sequelize.authenticate();

        await sequelize.query('PRAGMA foreign_keys = ON');

        console.log('[SQLite] Database connected successfully');
        console.log(`[SQLite] Database location: ${databasePath}`);

        return sequelize;
    } catch (error) {
        console.error(`[SQLite] Connection error: ${error.message}`);
        throw error;
    }
};

module.exports = {
    sequelize,
    connectSQLite
};