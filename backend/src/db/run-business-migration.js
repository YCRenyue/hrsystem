/**
 * Run business data tables migration
 */
require('dotenv').config();
const { sequelize } = require('../config/database');
const migration = require('./migrations/03-create-business-data-tables');

async function runMigration() {
  try {
    console.log('Running business data tables migration...');
    await sequelize.authenticate();
    console.log('Database connected successfully');

    const queryInterface = sequelize.getQueryInterface();
    await migration.up(queryInterface, sequelize.constructor);

    console.log('✓ Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('✗ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
