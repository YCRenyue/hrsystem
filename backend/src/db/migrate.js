const { sequelize } = require('../config/database');
const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

const createDatabase = async () => {
  try {
    // Create connection without database name
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      charset: 'utf8mb4'
    });

    // Create database if it doesn't exist
    const dbName = process.env.DB_NAME || 'hr_system';
    await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` 
      DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    
    console.log(`Database '${dbName}' created or already exists.`);
    await connection.end();
  } catch (error) {
    console.error('Error creating database:', error);
    throw error;
  }
};

const runSQLFile = async (filePath) => {
  try {
    const sql = await fs.readFile(filePath, 'utf8');
    
    // Split SQL file into individual statements
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    for (const statement of statements) {
      if (statement.trim()) {
        await sequelize.query(statement);
      }
    }
    
    console.log(`Successfully executed: ${path.basename(filePath)}`);
  } catch (error) {
    console.error(`Error executing ${filePath}:`, error);
    throw error;
  }
};

const migrate = async () => {
  try {
    console.log('Starting database migration...');
    
    // Create database
    await createDatabase();
    
    // Test connection
    await sequelize.authenticate();
    console.log('Database connection successful.');
    
    // Define SQL files in order
    const sqlFiles = [
      '../../../database/tables/02_departments.sql',
      '../../../database/tables/01_employees.sql',
      '../../../database/tables/11_users.sql',
      '../../../database/tables/03_onboarding_processes.sql',
      '../../../database/tables/04_attendance_records.sql',
      '../../../database/tables/05_annual_leaves.sql',
      '../../../database/tables/06_social_security.sql',
      '../../../database/tables/07_business_trip_allowances.sql',
      '../../../database/tables/08_meal_records.sql',
      '../../../database/tables/09_documents.sql',
      '../../../database/tables/10_audit_logs.sql'
    ];

    // Execute SQL files
    for (const file of sqlFiles) {
      const filePath = path.join(__dirname, file);
      try {
        await runSQLFile(filePath);
      } catch (error) {
        console.warn(`Warning: Could not execute ${file}, file might not exist yet.`);
      }
    }
    
    console.log('Database migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
};

// Run migration if called directly
if (require.main === module) {
  migrate();
}

module.exports = { migrate };