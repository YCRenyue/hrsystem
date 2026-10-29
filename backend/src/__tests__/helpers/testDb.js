/**
 * Real MySQL database for integration tests.
 *
 * Each Jest worker gets its own database (hr_system_test_<worker>, see jest.env.js), built with the
 * project's own migrations so the schema matches production. Tables are emptied before each test.
 */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { sequelize } = require('../../models');

const MIGRATIONS_DIR = path.join(__dirname, '../../db/migrations');
const MIGRATIONS_TABLE = 'sequelize_migrations';

function assertTestDatabase() {
  const name = process.env.DB_NAME || '';
  if (!name.startsWith('hr_system_test_')) {
    throw new Error(`Refusing to touch non-test database "${name}"`);
  }
}

async function createDatabaseIfMissing() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || ''
  });
  await conn.query(
    `CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\` `
    + 'CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'
  );
  await conn.end();
}

async function runPendingMigrations() {
  const qi = sequelize.getQueryInterface();
  await sequelize.query(
    `CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (name VARCHAR(255) PRIMARY KEY, executed_at DATETIME)`
  );
  const [rows] = await sequelize.query(`SELECT name FROM ${MIGRATIONS_TABLE}`);
  const done = new Set(rows.map((r) => r.name));
  const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.js')).sort();
  for (const file of files.filter((f) => !done.has(f))) {
    // eslint-disable-next-line global-require, import/no-dynamic-require
    const migration = require(path.join(MIGRATIONS_DIR, file));
    // eslint-disable-next-line no-await-in-loop -- migrations must run in order
    await migration.up(qi, sequelize.constructor);
    // eslint-disable-next-line no-await-in-loop
    await sequelize.query(`INSERT INTO ${MIGRATIONS_TABLE} VALUES (?, NOW())`, { replacements: [file] });
  }
}

/** Create and migrate this worker's test database. Call once in beforeAll. */
async function setupTestDb() {
  assertTestDatabase();
  await createDatabaseIfMissing();
  const log = jest.spyOn(console, 'log').mockImplementation(() => {});
  try {
    await runPendingMigrations();
  } finally {
    log.mockRestore();
  }
}

/** Empty every table (keeps the schema). Call in beforeEach. */
async function resetTestDb() {
  assertTestDatabase();
  const [tables] = await sequelize.query(
    'SELECT table_name AS t FROM information_schema.tables WHERE table_schema = DATABASE()'
  );
  await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
  for (const { t } of tables) {
    // eslint-disable-next-line no-continue
    if (t === MIGRATIONS_TABLE) continue;
    // eslint-disable-next-line no-await-in-loop
    await sequelize.query(`DELETE FROM \`${t}\``);
  }
  await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
}

async function closeTestDb() {
  await sequelize.close();
}

module.exports = { setupTestDb, resetTestDb, closeTestDb };
