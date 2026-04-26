/**
 * Database seed script.
 *
 * Production-safe and idempotent: ensures one admin user exists without
 * deleting or recreating business data.
 */

require('dotenv').config();

const { sequelize, User } = require('../models');
const { ROLE_PERMISSIONS_MAP } = require('../constants/permissions');
const { encryptionService } = require('../utils/encryption');

const DEFAULT_ADMIN_USERNAME = 'admin';
const DEFAULT_ADMIN_PASSWORD = '123456';

function envValue(name, fallback) {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : fallback;
}

function envFlag(name, fallback = false) {
  const value = process.env[name];
  if (value === undefined || value === '') {
    return fallback;
  }
  return value.toLowerCase() === 'true';
}

async function seed() {
  const username = envValue('SEED_ADMIN_USERNAME', DEFAULT_ADMIN_USERNAME);
  const password = envValue('SEED_ADMIN_PASSWORD', DEFAULT_ADMIN_PASSWORD);
  const displayName = envValue('SEED_ADMIN_DISPLAY_NAME', 'System Administrator');
  const email = envValue('SEED_ADMIN_EMAIL', 'admin@hrsystem.com');
  const phone = envValue('SEED_ADMIN_PHONE', '13800000001');
  const resetPassword = envFlag('SEED_ADMIN_RESET_PASSWORD', false);

  try {
    console.log('Starting database seed...');
    await sequelize.authenticate();

    const adminDefaults = {
      display_name: displayName,
      email,
      phone,
      role: 'admin',
      permissions: ROLE_PERMISSIONS_MAP.admin,
      data_scope: 'all',
      can_view_sensitive: true,
      status: 'active',
      is_active: true,
      created_by: 'system'
    };

    const existingAdmin = await User.findOne({ where: { username } });

    if (existingAdmin) {
      const updates = { ...adminDefaults };

      if (resetPassword) {
        updates.password_hash = await encryptionService.hashPassword(password);
        updates.must_change_password = true;
        updates.password_changed_at = new Date();
      }

      await existingAdmin.update(updates);
      console.log(`Admin user already exists: ${username}`);
      console.log(resetPassword ? 'Admin password was reset.' : 'Admin password was not changed.');
    } else {
      await User.create({
        username,
        password_hash: await encryptionService.hashPassword(password),
        must_change_password: true,
        ...adminDefaults
      });

      console.log(`Admin user created: ${username}`);
      if (!process.env.SEED_ADMIN_PASSWORD) {
        console.warn(`Using default admin password: ${DEFAULT_ADMIN_PASSWORD}`);
      }
    }

    console.log('Database seed completed successfully.');
  } catch (error) {
    console.error('Database seed failed:', error);
    console.error(error.stack);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  seed();
}

module.exports = seed;
