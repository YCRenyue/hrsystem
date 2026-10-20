/**
 * Database seed script.
 *
 * Production-safe and idempotent: ensures one admin user exists without
 * deleting or recreating business data.
 */

require('dotenv').config();

const { sequelize, Department, User } = require('../models');
const { ROLE_PERMISSIONS_MAP } = require('../constants/permissions');
const { encryptionService } = require('../utils/encryption');

const DEFAULT_ADMIN_USERNAME = 'admin';
const DEFAULT_ADMIN_PASSWORD = '123456';
const DEPARTMENTS = [
  ['DEPT_01', '办公室'],
  ['DEPT_02', '财务部'],
  ['DEPT_03', '采购部'],
  ['DEPT_04', '仓储部'],
  ['DEPT_05', '技术部'],
  ['DEPT_06', '妈妈班'],
  ['DEPT_07', '人事'],
  ['DEPT_08', '设备部'],
  ['DEPT_09', '生产部'],
  ['DEPT_10', '市场部'],
  ['DEPT_11', '物流部'],
  ['DEPT_12', '销售部'],
  ['DEPT_13', '行政部'],
  ['DEPT_14', '质量部'],
  ['DEPT_15', '综合部']
];

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

/**
 * Ensure the departments represented in the current employee roster exist.
 *
 * @returns {Promise<void>}
 */
async function seedDepartments() {
  for (const [code, name] of DEPARTMENTS) {
    const [department, created] = await Department.findOrCreate({
      where: { code },
      defaults: {
        name,
        level: 1,
        path: name,
        status: 'active',
        sort_order: Number(code.slice(-2)),
        created_by: 'system'
      }
    });

    if (!created && department.name !== name) {
      await department.update({ name, path: name, status: 'active' });
    }
  }

  console.log(`Departments seeded: ${DEPARTMENTS.length}`);
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
    await seedDepartments();

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
