const { Sequelize } = require('sequelize');
const path = require('path');
const fs = require('fs');

const dialect = process.env.DB_DIALECT || 'sqlite';

let sequelize;

if (dialect === 'postgres') {
    if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL is required for PostgreSQL.');
    }

    sequelize = new Sequelize(process.env.DATABASE_URL, {
        dialect: 'postgres',
        logging: false,
        dialectOptions: {
            ssl: process.env.NODE_ENV === 'production'
                ? { require: true, rejectUnauthorized: false }
                : false
        },
        pool: {
            max: 2,
            min: 0,
            acquire: 30000,
            idle: 10000
        }
    });
} else {
    const databaseDirectory = path.join(__dirname, '..', 'database');

    if (!fs.existsSync(databaseDirectory)) {
        fs.mkdirSync(databaseDirectory, { recursive: true });
    }

    const databasePath = path.join(
        databaseDirectory,
        process.env.DB_STORAGE || 'iem_admission_portal.sqlite'
    );

    sequelize = new Sequelize({
        dialect: 'sqlite',
        storage: databasePath,
        logging: false
    });
}

const connectDatabase = async () => {
    try {
        await sequelize.authenticate();

        if (dialect === 'sqlite') {
            await sequelize.query('PRAGMA foreign_keys = ON');
        }

        console.log(`[Database] ${dialect} connected successfully`);
        return sequelize;
    } catch (error) {
        console.error(`[Database] Connection error: ${error.message}`);
        throw error;
    }
};

// Keep the old export name for compatibility with existing code.
module.exports = {
    sequelize,
    connectDatabase,
    connectSQLite: connectDatabase
};
