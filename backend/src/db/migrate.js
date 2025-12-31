/**
 * Database Migration Script
 * Runs all pending migrations with tracking support
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { sequelize } = require('../config/database');

const MIGRATIONS_TABLE = 'sequelize_migrations';

/**
 * Ensure migrations tracking table exists
 */
async function ensureMigrationsTable(queryInterface, Sequelize) {
  await queryInterface.createTable(MIGRATIONS_TABLE, {
    name: {
      type: Sequelize.STRING(255),
      primaryKey: true,
      allowNull: false
    },
    executed_at: {
      type: Sequelize.DATE,
      defaultValue: Sequelize.NOW,
      allowNull: false
    }
  }, {
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci'
  }).catch((err) => {
    // Table already exists, ignore error
    if (err.original && err.original.code !== 'ER_TABLE_EXISTS_ERROR') {
      throw err;
    }
  });
}

/**
 * Get list of already executed migrations
 */
async function getExecutedMigrations(queryInterface) {
  try {
    const [results] = await queryInterface.sequelize.query(
      `SELECT name FROM ${MIGRATIONS_TABLE} ORDER BY name`
    );
    return results.map((row) => row.name);
  } catch (err) {
    // Table doesn't exist yet
    return [];
  }
}

/**
 * Record a migration as executed
 */
async function recordMigration(queryInterface, migrationName) {
  await queryInterface.sequelize.query(
    `INSERT INTO ${MIGRATIONS_TABLE} (name, executed_at) VALUES (?, NOW())`,
    { replacements: [migrationName] }
  );
}

/**
 * Remove a migration record (for rollback)
 */
async function removeMigrationRecord(queryInterface, migrationName) {
  await queryInterface.sequelize.query(
    `DELETE FROM ${MIGRATIONS_TABLE} WHERE name = ?`,
    { replacements: [migrationName] }
  );
}

async function runMigrations() {
  try {
    console.log('========================================');
    console.log('Starting database migrations...');
    console.log('========================================\n');

    if (process.env.NODE_ENV === 'production') {
      console.warn('WARNING: Running migrations in production!');
      console.warn('Make sure you have a database backup!\n');
    }

    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Database connection successful\n');

    const queryInterface = sequelize.getQueryInterface();
    const { Sequelize } = sequelize;

    // Ensure migrations table exists
    await ensureMigrationsTable(queryInterface, Sequelize);

    // Get executed migrations
    const executedMigrations = await getExecutedMigrations(queryInterface);
    console.log(`Already executed: ${executedMigrations.length} migrations`);

    // Get migration files
    const migrationsDir = path.join(__dirname, 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.js'))
      .sort();

    console.log(`Found ${migrationFiles.length} migration files\n`);

    // Filter pending migrations
    const pendingMigrations = migrationFiles.filter(
      (file) => !executedMigrations.includes(file)
    );

    if (pendingMigrations.length === 0) {
      console.log('No pending migrations. Database is up to date.\n');
      process.exit(0);
    }

    console.log(`Pending migrations: ${pendingMigrations.length}\n`);

    // Run pending migrations
    for (const file of pendingMigrations) {
      console.log(`Executing: ${file}`);
      const migration = require(path.join(migrationsDir, file));

      await migration.up(queryInterface, Sequelize);
      await recordMigration(queryInterface, file);
      console.log(`Done: ${file}\n`);
    }

    console.log('========================================');
    console.log('All migrations completed successfully!');
    console.log('========================================\n');

    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

async function rollbackMigration() {
  try {
    console.log('========================================');
    console.log('Rolling back last migration...');
    console.log('========================================\n');

    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Database connection successful\n');

    const queryInterface = sequelize.getQueryInterface();
    const { Sequelize } = sequelize;

    // Get executed migrations
    const executedMigrations = await getExecutedMigrations(queryInterface);

    if (executedMigrations.length === 0) {
      console.log('No migrations to rollback.\n');
      process.exit(0);
    }

    // Get the last executed migration
    const lastMigration = executedMigrations[executedMigrations.length - 1];
    console.log(`Rolling back: ${lastMigration}`);

    const migrationsDir = path.join(__dirname, 'migrations');
    const migration = require(path.join(migrationsDir, lastMigration));

    if (typeof migration.down !== 'function') {
      console.error(`Migration ${lastMigration} does not have a down function`);
      process.exit(1);
    }

    await migration.down(queryInterface, Sequelize);
    await removeMigrationRecord(queryInterface, lastMigration);
    console.log(`Rolled back: ${lastMigration}\n`);

    console.log('========================================');
    console.log('Rollback completed successfully!');
    console.log('========================================\n');

    process.exit(0);
  } catch (error) {
    console.error('Rollback failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Handle command line arguments
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.includes('--rollback') || args.includes('-r')) {
    rollbackMigration();
  } else {
    runMigrations();
  }
}

module.exports = { runMigrations, rollbackMigration };
