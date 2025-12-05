/**
 * MySQL Connection Test Helper
 * This script helps diagnose MySQL connection issues
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function testConnection() {
  console.log('🔍 MySQL Connection Diagnostics\n');

  // Test 1: Check environment variables
  console.log('📋 Environment Variables:');
  console.log(`   DB_HOST: ${process.env.DB_HOST || 'NOT SET'}`);
  console.log(`   DB_PORT: ${process.env.DB_PORT || 'NOT SET'}`);
  console.log(`   DB_USER: ${process.env.DB_USER || 'NOT SET'}`);
  console.log(`   DB_PASSWORD: ${process.env.DB_PASSWORD ? '***SET***' : 'NOT SET'}`);
  console.log(`   DB_NAME: ${process.env.DB_NAME || 'NOT SET'}\n`);

  // Test 2: Try connecting without database specified
  console.log('🔌 Testing connection to MySQL server (without database)...');

  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || ''
  };

  try {
    const connection = await mysql.createConnection(config);
    console.log('✅ Connected to MySQL server successfully!\n');

    // Test 3: Check MySQL version
    const [rows] = await connection.query('SELECT VERSION() as version');
    console.log(`📦 MySQL Version: ${rows[0].version}\n`);

    // Test 4: List all databases
    console.log('📚 Available Databases:');
    const [databases] = await connection.query('SHOW DATABASES');
    databases.forEach((db) => {
      const dbName = db.Database || db.database;
      if (dbName === process.env.DB_NAME) {
        console.log(`   ✅ ${dbName} (TARGET DATABASE)`);
      } else {
        console.log(`   - ${dbName}`);
      }
    });
    console.log('');

    // Test 5: Check if target database exists
    const targetDb = process.env.DB_NAME || 'hr_system';
    const dbExists = databases.some((db) => (db.Database || db.database) === targetDb);

    if (dbExists) {
      console.log(`✅ Target database '${targetDb}' exists\n`);

      // Test 6: Connect to target database
      console.log('🔌 Testing connection to target database...');
      await connection.query(`USE ${targetDb}`);
      console.log(`✅ Successfully connected to '${targetDb}'\n`);

      // Test 7: List tables in database
      console.log('📋 Tables in database:');
      const [tables] = await connection.query('SHOW TABLES');
      if (tables.length > 0) {
        tables.forEach((table) => {
          const tableName = Object.values(table)[0];
          console.log(`   - ${tableName}`);
        });
      } else {
        console.log('   (No tables found - database may need migration)');
      }
      console.log('');
    } else {
      console.log(`⚠️  Target database '${targetDb}' does NOT exist\n`);
      console.log('💡 To create the database, run:');
      console.log(`   CREATE DATABASE ${targetDb} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\n`);
    }

    await connection.end();
    console.log('✨ All connection tests completed successfully!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Connection test failed:\n');

    if (error.code === 'ECONNREFUSED') {
      console.error('Error: Cannot connect to MySQL server');
      console.error('\n💡 Solutions:');
      console.error('   1. Check if MySQL server is running');
      console.error('   2. Verify the port (default: 3306)');
      console.error('   3. Check if MySQL is installed\n');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('Error: Access denied - Invalid credentials');
      console.error('\n💡 Solutions:');
      console.error('   1. Check DB_USER and DB_PASSWORD in .env file');
      console.error('   2. Verify MySQL user has proper permissions');
      console.error('   3. Try resetting MySQL root password\n');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error(`Error: Database '${process.env.DB_NAME}' does not exist`);
      console.error('\n💡 Solution:');
      console.error(`   Create the database: CREATE DATABASE ${process.env.DB_NAME};\n`);
    } else {
      console.error(`Error: ${error.message}`);
      console.error(`Code: ${error.code}\n`);
    }

    console.error('Full error details:');
    console.error(error);
    process.exit(1);
  }
}

testConnection();
