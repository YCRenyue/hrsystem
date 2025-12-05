/**
 * Quick Database Connection Check Script
 * Run this file directly to test database connection
 * Usage: node src/__tests__/checkConnection.js
 */

const { sequelize } = require('../config/database');
const {
  Department, Employee, User, OnboardingProcess
} = require('../models');

/**
 * Check database connection
 */
async function checkConnection() {
  console.log('🔍 Checking database connection...\n');

  try {
    // Test authentication
    console.log('1️⃣  Testing database authentication...');
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully\n');

    // Check database info
    console.log('2️⃣  Database configuration:');
    console.log(`   - Dialect: ${sequelize.options.dialect}`);
    console.log(`   - Database: ${sequelize.config.database}`);
    console.log(`   - Host: ${sequelize.config.host}`);
    console.log(`   - Port: ${sequelize.config.port}`);
    console.log(`   - Charset: ${sequelize.options.charset}`);
    console.log(`   - Collation: ${sequelize.options.collate}\n`);

    // Check connection pool
    console.log('3️⃣  Connection pool settings:');
    console.log(`   - Max connections: ${sequelize.options.pool.max}`);
    console.log(`   - Min connections: ${sequelize.options.pool.min}`);
    console.log(`   - Acquire timeout: ${sequelize.options.pool.acquire}ms`);
    console.log(`   - Idle timeout: ${sequelize.options.pool.idle}ms\n`);

    // Test simple query
    console.log('4️⃣  Running test query...');
    const [results] = await sequelize.query('SELECT 1 + 1 AS result');
    console.log(`✅ Query successful: ${results[0].result}\n`);

    // Check if tables exist
    console.log('5️⃣  Checking database tables...');
    const [tables] = await sequelize.query(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
      ORDER BY TABLE_NAME
    `);

    if (tables.length > 0) {
      console.log(`✅ Found ${tables.length} tables in database:`);
      tables.forEach((table) => {
        console.log(`   - ${table.TABLE_NAME}`);
      });
      console.log('');
    } else {
      console.log('⚠️  No tables found in database (database may need migration)\n');
    }

    // Check models
    console.log('6️⃣  Checking model definitions...');
    const models = [
      { name: 'Department', model: Department },
      { name: 'Employee', model: Employee },
      { name: 'User', model: User },
      { name: 'OnboardingProcess', model: OnboardingProcess }
    ];

    models.forEach(({ name, model }) => {
      const attributes = Object.keys(model.rawAttributes).length;
      console.log(`   ✅ ${name} model (${attributes} attributes)`);
    });
    console.log('');

    // Check model associations
    console.log('7️⃣  Checking model associations...');
    const associations = [
      { model: 'Department', count: Object.keys(Department.associations).length },
      { model: 'Employee', count: Object.keys(Employee.associations).length },
      { model: 'User', count: Object.keys(User.associations).length },
      { model: 'OnboardingProcess', count: Object.keys(OnboardingProcess.associations).length }
    ];

    associations.forEach(({ model, count }) => {
      console.log(`   ✅ ${model}: ${count} association(s)`);
    });
    console.log('');

    // Test connection pool
    console.log('8️⃣  Testing connection pool...');
    const { pool } = sequelize.connectionManager;
    if (pool) {
      console.log('✅ Connection pool initialized\n');
    } else {
      console.log('⚠️  Connection pool not initialized\n');
    }

    console.log('✨ All database checks passed successfully!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database connection check failed:\n');
    console.error(`Error: ${error.message}`);
    console.error('\nPlease check:');
    console.error('1. MySQL server is running');
    console.error('2. Database credentials in .env file are correct');
    console.error('3. Database exists and is accessible');
    console.error('4. Network connection to database server\n');

    if (error.stack) {
      console.error('Stack trace:');
      console.error(error.stack);
    }

    process.exit(1);
  } finally {
    // Close connection
    await sequelize.close();
  }
}

// Run the check
checkConnection();
