
/**
 * SQLite Admin Seed Script
 * Creates or updates the administrator account.
 */

const path = require('path');
require('dotenv').config({
  path: path.join(__dirname, '../.env')
});

const bcrypt = require('bcryptjs');
const { connectSQLite, sequelize } = require('../config/database');
const { User } = require('../models/sqlite');
const { ROLES } = require('../config/constants');

const seedAdmin = async () => {
  try {
    console.log('[Seed Admin] Starting SQLite administrator seeding...');

    await connectSQLite();

    const adminEmail = (
      process.env.SEED_ADMIN_EMAIL || 'admin@iem.edu.in'
    ).toLowerCase().trim();

    // Never use a hardcoded default password.
    const adminPassword = process.env.SEED_ADMIN_PASSWORD;

    const adminName =
      process.env.SEED_ADMIN_NAME || 'IEM Admission Administrator';

    const adminPhone =
      process.env.SEED_ADMIN_PHONE || '9876543210';

    if (!adminPassword || adminPassword.length < 6) {
      throw new Error(
        'Configure SEED_ADMIN_PASSWORD in backend/.env. Minimum length: 6 characters.'
      );
    }

    if (!/^[0-9]{10}$/.test(adminPhone)) {
      throw new Error('Admin phone number must contain exactly 10 digits.');
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const existingAdmin = await User.findOne({
      where: { email: adminEmail }
    });

    if (existingAdmin) {
      console.log('[Seed Admin] Existing administrator found. Updating account...');

      existingAdmin.fullName = adminName;
      existingAdmin.password = hashedPassword;
      existingAdmin.phone = adminPhone;
      existingAdmin.role = ROLES.ADMIN;

      await existingAdmin.save();

      console.log('[Seed Admin] Administrator account updated successfully.');
    } else {
      await User.create({
        fullName: adminName,
        email: adminEmail,
        password: hashedPassword,
        phone: adminPhone,
        role: ROLES.ADMIN
      });

      console.log('[Seed Admin] New administrator created successfully.');
    }

    console.log(`[Seed Admin] Admin email: ${adminEmail}`);
    console.log('[Seed Admin] SQLite admin seeding completed.');
  } catch (error) {
    console.error(`[Seed Admin] Error: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
    console.log('[Seed Admin] SQLite connection closed.');
  }
};

if (require.main === module) {
  seedAdmin();
}

module.exports = seedAdmin;

