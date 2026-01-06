/**
 * DingTalk Employee Sync Script
 *
 * This script synchronizes employee data from DingTalk to the local database.
 * It searches for users by their mobile phone numbers and imports their information.
 *
 * Usage:
 *   node scripts/sync-dingtalk-employees.js [phone1,phone2,...]
 *
 * If no phone numbers are provided, it will use the default test numbers.
 */

const path = require('path');

// Load environment variables from backend directory
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const dingTalkService = require('../src/services/DingTalkService');
const Employee = require('../src/models/Employee');
const Department = require('../src/models/Department');
const { sequelize } = require('../src/config/database');

// Default test phone numbers
const DEFAULT_PHONES = ['18019069806', '18064626004'];

/**
 * Generate a unique employee number
 * @returns {Promise<string>} Employee number
 */
async function generateEmployeeNumber() {
  const prefix = 'EMP';
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');

  // Find the highest employee number for this month
  const pattern = `${prefix}${year}${month}%`;
  const lastEmployee = await Employee.findOne({
    where: {
      employee_number: {
        [sequelize.Sequelize.Op.like]: pattern
      }
    },
    order: [['employee_number', 'DESC']]
  });

  let sequence = 1;
  if (lastEmployee) {
    const lastNumber = lastEmployee.employee_number;
    const lastSeq = parseInt(lastNumber.slice(-4), 10);
    sequence = lastSeq + 1;
  }

  return `${prefix}${year}${month}${sequence.toString().padStart(4, '0')}`;
}

/**
 * Get or create default department
 * @returns {Promise<Object>} Department object
 */
async function getOrCreateDefaultDepartment() {
  let department = await Department.findOne({
    where: { code: 'DEFAULT' }
  });

  if (!department) {
    console.log('Creating default department...');
    department = await Department.create({
      name: 'Default Department',
      code: 'DEFAULT',
      level: 1,
      status: 'active',
      description: 'Default department for imported employees'
    });
    console.log(`Created default department: ${department.department_id}`);
  }

  return department;
}

/**
 * Sync a single employee from DingTalk
 * @param {string} mobile - Mobile phone number
 * @param {Object} defaultDept - Default department object
 * @returns {Promise<Object>} Sync result
 */
async function syncEmployee(mobile, defaultDept) {
  try {
    console.log(`\n[Processing] Mobile: ${mobile}`);

    // Check if employee already exists
    const existingEmployee = await Employee.findOne({
      where: {
        phone_encrypted: {
          [sequelize.Sequelize.Op.ne]: null
        }
      }
    });

    // Since phone is encrypted, we need to check manually
    if (existingEmployee) {
      const employees = await Employee.findAll();
      for (const emp of employees) {
        if (emp.getPhone() === mobile) {
          console.log(`[Exists] Employee already exists with employee_number: ${emp.employee_number}`);
          return {
            success: true,
            action: 'skipped',
            mobile,
            employee: emp.toSafeObject()
          };
        }
      }
    }

    // Search user in DingTalk - try old API first
    console.log('[DingTalk] Searching for user by mobile...');
    const userId = await dingTalkService.getUserIdByMobile(mobile);

    if (!userId) {
      console.log(`[Not Found] No DingTalk user found for mobile: ${mobile}`);
      return {
        success: false,
        action: 'not_found',
        mobile,
        error: 'User not found in DingTalk'
      };
    }

    console.log(`[Found] DingTalk user ID: ${userId}`);

    // Get full user info
    console.log('[DingTalk] Fetching user details...');
    const dingTalkUser = await dingTalkService.getUserInfo(userId);

    console.log(`[Found] User details: ${dingTalkUser.name}`);

    // Generate employee number
    const employeeNumber = await generateEmployeeNumber();

    // Create employee record
    const employee = await Employee.create({
      employee_number: employeeNumber,
      email: dingTalkUser.email || null,
      department_id: defaultDept.department_id,
      position: dingTalkUser.title || 'Employee',
      employment_type: 'full_time',
      entry_date: new Date(),
      status: 'active',
      dingtalk_user_id: userId,
      data_complete: false,
      created_by: 'system'
    });

    // Set encrypted fields using setter methods
    employee.setName(dingTalkUser.name);
    employee.setPhone(mobile);

    await employee.save();

    console.log(`[Created] Employee created successfully: ${employeeNumber}`);
    console.log(`  - Name: ${dingTalkUser.name}`);
    console.log(`  - Email: ${dingTalkUser.email || 'N/A'}`);
    console.log(`  - Position: ${dingTalkUser.title || 'Employee'}`);
    console.log(`  - DingTalk ID: ${userId}`);

    return {
      success: true,
      action: 'created',
      mobile,
      employee: employee.toSafeObject()
    };
  } catch (error) {
    console.error(`[Error] Failed to sync employee for ${mobile}:`, error.message);
    return {
      success: false,
      action: 'error',
      mobile,
      error: error.message
    };
  }
}

/**
 * Main sync function
 */
async function main() {
  try {
    console.log('='.repeat(60));
    console.log('DingTalk Employee Sync Script');
    console.log('='.repeat(60));

    // Parse phone numbers from command line or use defaults
    let phoneNumbers = DEFAULT_PHONES;
    if (process.argv.length > 2) {
      const argPhones = process.argv[2];
      phoneNumbers = argPhones.split(',').map((p) => p.trim()).filter((p) => p);
    }

    console.log(`\nPhone numbers to process: ${phoneNumbers.join(', ')}`);
    console.log(`Total: ${phoneNumbers.length} numbers\n`);

    // Test database connection
    console.log('Testing database connection...');
    await sequelize.authenticate();
    console.log('Database connection successful!\n');

    // Test DingTalk API
    console.log('Testing DingTalk API connection...');
    await dingTalkService.getAccessToken();
    console.log('DingTalk API connection successful!\n');

    // Get or create default department
    const defaultDept = await getOrCreateDefaultDepartment();

    // Sync employees
    const results = [];
    for (const phone of phoneNumbers) {
      const result = await syncEmployee(phone, defaultDept);
      results.push(result);
    }

    // Print summary
    console.log(`\n${'='.repeat(60)}`);
    console.log('Sync Summary');
    console.log('='.repeat(60));

    const created = results.filter((r) => r.action === 'created').length;
    const skipped = results.filter((r) => r.action === 'skipped').length;
    const notFound = results.filter((r) => r.action === 'not_found').length;
    const errors = results.filter((r) => r.action === 'error').length;

    console.log(`Total processed: ${results.length}`);
    console.log(`Created: ${created}`);
    console.log(`Skipped (already exists): ${skipped}`);
    console.log(`Not found in DingTalk: ${notFound}`);
    console.log(`Errors: ${errors}`);

    if (errors > 0) {
      console.log('\nErrors:');
      results.filter((r) => r.action === 'error').forEach((r) => {
        console.log(`  - ${r.mobile}: ${r.error}`);
      });
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log('Sync completed!');
    console.log('='.repeat(60));

    process.exit(0);
  } catch (error) {
    console.error('\n[FATAL ERROR]', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { syncEmployee, generateEmployeeNumber };
