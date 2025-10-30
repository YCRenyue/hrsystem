/**
 * Test script for models and encryption
 * Run with: node src/test-models.js
 */
require('dotenv').config();
const { sequelize, Department, Employee, User, OnboardingProcess } = require('./models');
const { encryptionService } = require('./utils/encryption');
const EmployeeRepository = require('./repositories/EmployeeRepository');

async function testEncryption() {
  console.log('\n=== Testing Encryption ===');

  const testData = {
    name: '张三',
    phone: '13800138000',
    idCard: '110101199001011234',
    bankCard: '6222021234567890123'
  };

  console.log('Original data:', testData);

  // Test encryption
  const encrypted = {
    name: encryptionService.encrypt(testData.name),
    phone: encryptionService.encrypt(testData.phone),
    idCard: encryptionService.encrypt(testData.idCard),
    bankCard: encryptionService.encrypt(testData.bankCard)
  };

  console.log('Encrypted data (sample):', {
    name: encrypted.name.substring(0, 50) + '...',
    phone: encrypted.phone.substring(0, 50) + '...'
  });

  // Test decryption
  const decrypted = {
    name: encryptionService.decrypt(encrypted.name),
    phone: encryptionService.decrypt(encrypted.phone),
    idCard: encryptionService.decrypt(encrypted.idCard),
    bankCard: encryptionService.decrypt(encrypted.bankCard)
  };

  console.log('Decrypted data:', decrypted);

  // Test masking
  const masked = {
    phone: encryptionService.maskPhone(testData.phone),
    idCard: encryptionService.maskIdCard(testData.idCard),
    bankCard: encryptionService.maskBankCard(testData.bankCard)
  };

  console.log('Masked data:', masked);

  // Verify data integrity
  const isValid = Object.keys(testData).every(key => testData[key] === decrypted[key]);
  console.log('Encryption/Decryption integrity:', isValid ? '✓ PASSED' : '✗ FAILED');
}

async function testDatabase() {
  console.log('\n=== Testing Database Connection ===');

  try {
    await sequelize.authenticate();
    console.log('✓ Database connection successful');
  } catch (error) {
    console.error('✗ Database connection failed:', error.message);
    throw error;
  }
}

async function testModels() {
  console.log('\n=== Testing Models ===');

  try {
    // Clean up test data from previous runs
    console.log('\n0. Cleaning up existing test data...');
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    await sequelize.query('TRUNCATE TABLE onboarding_processes');
    await sequelize.query('TRUNCATE TABLE users');
    await sequelize.query('TRUNCATE TABLE employees');
    await sequelize.query('TRUNCATE TABLE departments');
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('✓ Database cleaned up');

    // Test Department model
    console.log('\n1. Testing Department model...');
    const department = await Department.create({
      name: '技术部',
      code: 'TECH',
      description: 'IT技术部门',
      created_by: 'system'
    });
    console.log('✓ Department created:', department.department_id);

    // Test Employee model with encryption
    console.log('\n2. Testing Employee model with encryption...');
    const employee = await EmployeeRepository.createWithEncryption({
      employee_number: 'EMP001',
      name: '张三',
      phone: '13800138000',
      id_card: '110101199001011234',
      email: 'zhangsan@example.com',
      department_id: department.department_id,
      position: '软件工程师',
      entry_date: new Date(),
      status: 'pending',
      created_by: 'system'
    });
    console.log('✓ Employee created:', employee.employee_id);

    // Test reading encrypted data
    console.log('\n3. Testing encrypted data retrieval...');
    const foundEmployee = await EmployeeRepository.findById(employee.employee_id);
    console.log('Employee name (decrypted):', foundEmployee.getName());
    console.log('Employee phone (masked):', foundEmployee.getMaskedPhone());
    console.log('Employee ID card (masked):', foundEmployee.getMaskedIdCard());
    console.log('Employee age:', foundEmployee.getAge());
    console.log('Data complete:', foundEmployee.isDataComplete());

    // Test User model
    console.log('\n4. Testing User model...');
    const user = await User.create({
      employee_id: employee.employee_id,
      username: 'zhangsan',
      password_hash: await encryptionService.hashPassword('password123'),
      display_name: '张三',
      email: 'zhangsan@example.com',
      role: 'employee',
      permissions: ['view_profile', 'edit_profile'],
      created_by: 'system'
    });
    console.log('✓ User created:', user.user_id);

    // Test password verification
    const isPasswordValid = await user.verifyPassword('password123');
    console.log('Password verification:', isPasswordValid ? '✓ PASSED' : '✗ FAILED');

    // Test OnboardingProcess model
    console.log('\n5. Testing OnboardingProcess model...');
    const process = await OnboardingProcess.create({
      employee_id: employee.employee_id,
      status: 'pending',
      created_by: 'system'
    });
    console.log('✓ Onboarding process created:', process.process_id);

    // Generate form token and link
    process.generateFormToken();
    const formLink = process.generateFormLink('http://localhost:3000');
    console.log('Form token generated:', process.form_token);
    console.log('Form link:', formLink);
    console.log('Token expires at:', process.token_expires_at);

    await process.save();

    // Test associations
    console.log('\n6. Testing model associations...');
    const employeeWithRelations = await Employee.findByPk(employee.employee_id, {
      include: [
        { model: Department, as: 'department' },
        { model: User, as: 'user' },
        { model: OnboardingProcess, as: 'onboardingProcesses' }
      ]
    });

    console.log('Employee with relations:', {
      name: employeeWithRelations.getName(),
      department: employeeWithRelations.department?.name,
      user: employeeWithRelations.user?.username,
      onboardingProcesses: employeeWithRelations.onboardingProcesses?.length
    });

    // Test repository methods
    console.log('\n7. Testing repository methods...');
    const stats = await EmployeeRepository.getStatistics();
    console.log('Employee statistics:', stats);

    const pendingEmployees = await EmployeeRepository.findByStatus('pending');
    console.log('Pending employees count:', pendingEmployees.length);

    console.log('\n✓ All model tests passed!');

    // Cleanup
    console.log('\n=== Cleaning up test data ===');
    await process.destroy();
    await user.destroy();
    await employee.destroy();
    await department.destroy();
    console.log('✓ Test data cleaned up');

  } catch (error) {
    console.error('✗ Model test failed:', error);
    throw error;
  }
}

async function runTests() {
  console.log('===========================================');
  console.log('   HR System - Model & Encryption Tests');
  console.log('===========================================');

  try {
    // Test encryption first (doesn't require DB)
    await testEncryption();

    // Test database connection
    await testDatabase();

    // Run database migration first
    console.log('\n=== Running Database Migration ===');
    const { sequelize: migrateSequelize } = require('./config/database');
    const mysql = require('mysql2/promise');
    const fs = require('fs').promises;
    const path = require('path');

    // Create database if needed
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      charset: 'utf8mb4'
    });

    const dbName = process.env.DB_NAME || 'hr_system';
    await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`
      DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log(`Database '${dbName}' created or already exists.`);
    await connection.end();

    // Run SQL files
    const sqlFiles = [
      '../../../database/tables/02_departments.sql',
      '../../../database/tables/01_employees.sql',
      '../../../database/tables/11_users.sql',
      '../../../database/tables/03_onboarding_processes.sql'
    ];

    for (const file of sqlFiles) {
      const filePath = path.join(__dirname, 'db', file);
      try {
        const sql = await fs.readFile(filePath, 'utf8');
        const statements = sql.split(';').map(stmt => stmt.trim()).filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
        for (const statement of statements) {
          if (statement.trim()) {
            await sequelize.query(statement);
          }
        }
        console.log(`✓ Executed: ${path.basename(filePath)}`);
      } catch (error) {
        console.warn(`Warning: Could not execute ${file}:`, error.message);
      }
    }

    console.log('Database migration completed!');

    // Test models
    await testModels();

    console.log('\n===========================================');
    console.log('   ✓ All tests completed successfully!');
    console.log('===========================================\n');

    process.exit(0);
  } catch (error) {
    console.error('\n===========================================');
    console.error('   ✗ Tests failed!');
    console.error('===========================================\n');
    console.error(error);
    process.exit(1);
  }
}

// Run tests
runTests();
