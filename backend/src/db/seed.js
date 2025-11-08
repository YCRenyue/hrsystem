/**
 * Database Seed Script
 * Creates test users and sample data
 */

require('dotenv').config();
const { sequelize } = require('../config/database');
const { User, Department, Employee } = require('../models');
const { encryptionService } = require('../utils/encryption');

async function seed() {
  try {
    console.log('开始数据库种子操作...');

    // Sync database (create tables if they don't exist)
    await sequelize.sync();

    console.log('清理现有数据...');
    // Clear existing data (for dev/test only!)
    await User.destroy({ where: {}, force: true });
    await Employee.destroy({ where: {}, force: true });
    await Department.destroy({ where: {}, force: true });

    console.log('创建部门数据...');
    // Create departments
    const departments = await Department.bulkCreate([
      {
        department_id: '11111111-1111-1111-1111-111111111111',
        name: '研发部',
        code: 'RD',
        created_by: 'system'
      },
      {
        department_id: '22222222-2222-2222-2222-222222222222',
        name: '人力资源部',
        code: 'HR',
        created_by: 'system'
      },
      {
        department_id: '33333333-3333-3333-3333-333333333333',
        name: '市场部',
        code: 'MKT',
        created_by: 'system'
      },
      {
        department_id: '44444444-4444-4444-4444-444444444444',
        name: '财务部',
        code: 'FIN',
        created_by: 'system'
      }
    ]);

    console.log(`创建了 ${departments.length} 个部门`);

    console.log('创建测试用户账号...');
    // Create test users with hashed passwords
    const defaultPassword = 'password123'; // Default password for all test accounts
    const passwordHash = await encryptionService.hashPassword(defaultPassword);

    const users = [];

    // Admin user
    const adminUser = await User.create({
      user_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      username: 'admin',
      password_hash: passwordHash,
      display_name: '系统管理员',
      email: 'admin@hrsystem.com',
      phone: '13800000001',
      role: 'admin',
      permissions: ['*'],
      status: 'active',
      is_active: true,
      created_by: 'system'
    });
    users.push(adminUser);

    // HR user
    const hrUser = await User.create({
      user_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      username: 'hr_admin',
      password_hash: passwordHash,
      display_name: '人力资源管理员',
      email: 'hr@hrsystem.com',
      phone: '13800000002',
      role: 'hr',
      permissions: ['employees:read', 'employees:write', 'departments:read'],
      status: 'active',
      is_active: true,
      created_by: 'system'
    });
    users.push(hrUser);

    // Manager user
    const managerUser = await User.create({
      user_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
      username: 'manager',
      password_hash: passwordHash,
      display_name: '部门经理',
      email: 'manager@hrsystem.com',
      phone: '13800000003',
      role: 'manager',
      permissions: ['employees:read', 'departments:read'],
      status: 'active',
      is_active: true,
      created_by: 'system'
    });
    users.push(managerUser);

    // Regular employee user
    const employeeUser = await User.create({
      user_id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
      username: 'employee',
      password_hash: passwordHash,
      display_name: '普通员工',
      email: 'employee@hrsystem.com',
      phone: '13800000004',
      role: 'employee',
      permissions: ['employees:read:self'],
      status: 'active',
      is_active: true,
      created_by: 'system'
    });
    users.push(employeeUser);

    console.log(`创建了 ${users.length} 个测试用户`);

    console.log('创建示例员工数据...');
    // Create sample employee records
    const employee1 = Employee.build({
      employee_id: 'e1111111-1111-1111-1111-111111111111',
      employee_number: 'EMP001',
      email: 'zhangsan@hrsystem.com',
      department_id: '11111111-1111-1111-1111-111111111111',
      position: '高级工程师',
      employment_type: 'full_time',
      entry_date: new Date('2023-01-15'),
      status: 'regular',
      gender: 'male',
      address: '北京市朝阳区',
      emergency_contact: '李四',
      emergency_phone: '13900000001',
      created_by: 'system'
    });
    employee1.setName('张三');
    employee1.setPhone('13900000001');
    employee1.setIdCard('110101199001011234');
    employee1.setBirthDate(new Date('1990-01-01'));
    await employee1.save();

    const employee2 = Employee.build({
      employee_id: 'e2222222-2222-2222-2222-222222222222',
      employee_number: 'EMP002',
      email: 'lisi@hrsystem.com',
      department_id: '22222222-2222-2222-2222-222222222222',
      position: 'HR专员',
      employment_type: 'full_time',
      entry_date: new Date('2023-03-20'),
      status: 'regular',
      gender: 'female',
      address: '北京市海淀区',
      emergency_contact: '王五',
      emergency_phone: '13900000002',
      created_by: 'system'
    });
    employee2.setName('李四');
    employee2.setPhone('13900000002');
    employee2.setIdCard('110101199102021234');
    employee2.setBirthDate(new Date('1991-02-02'));
    await employee2.save();

    console.log('创建了 2 个示例员工');

    console.log('\n========================================');
    console.log('数据库种子操作完成！');
    console.log('========================================');
    console.log('\n测试账号信息：');
    console.log('----------------------------------------');
    console.log('管理员账号:');
    console.log('  用户名: admin');
    console.log('  密码: password123');
    console.log('  角色: 系统管理员\n');

    console.log('HR管理员账号:');
    console.log('  用户名: hr_admin');
    console.log('  密码: password123');
    console.log('  角色: 人力资源管理员\n');

    console.log('部门经理账号:');
    console.log('  用户名: manager');
    console.log('  密码: password123');
    console.log('  角色: 部门经理\n');

    console.log('普通员工账号:');
    console.log('  用户名: employee');
    console.log('  密码: password123');
    console.log('  角色: 普通员工\n');
    console.log('========================================\n');

    process.exit(0);
  } catch (error) {
    console.error('数据库种子操作失败:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run seed if called directly
if (require.main === module) {
  seed();
}

module.exports = seed;
