/**
 * Seed Data: RBAC Test Users
 *
 * Purpose: 创建5种角色的测试用户，用于权限系统测试
 *
 * 测试账号：
 * 1. 系统管理员 (admin) - admin/admin123
 * 2. HR管理员 (hr_admin) - hr_manager/hr123
 * 3. 生产部门经理 (department_manager) - prod_manager/pm123
 * 4. 销售部门经理 (department_manager) - sales_manager/sm123
 * 5. 生产部员工 (employee) - prod_emp1/emp123
 * 6. 销售部员工 (employee) - sales_emp1/emp123
 */

'use strict';

const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      console.log('开始创建 RBAC 测试用户...');

      // 获取现有部门ID
      const [departments] = await queryInterface.sequelize.query(
        `SELECT department_id, department_name FROM departments ORDER BY department_name`,
        { transaction }
      );

      if (departments.length < 3) {
        throw new Error('至少需要3个部门才能创建测试数据。请先运行部门种子数据。');
      }

      // 假设部门顺序：行政部、生产部、销售部
      const adminDept = departments.find(d => d.department_name.includes('行政'));
      const productionDept = departments.find(d => d.department_name.includes('生产'));
      const salesDept = departments.find(d => d.department_name.includes('销售'));

      console.log('找到部门:', {
        admin: adminDept?.department_name,
        production: productionDept?.department_name,
        sales: salesDept?.department_name
      });

      // 密码哈希
      const password123 = await bcrypt.hash('admin123', 10);
      const hrPassword = await bcrypt.hash('hr123', 10);
      const pmPassword = await bcrypt.hash('pm123', 10);
      const smPassword = await bcrypt.hash('sm123', 10);
      const empPassword = await bcrypt.hash('emp123', 10);

      // 准备用户数据
      const users = [];
      const employees = [];
      const now = new Date();

      // 1. 系统管理员
      const adminUserId = uuidv4();
      const adminEmpId = uuidv4();
      users.push({
        user_id: adminUserId,
        employee_id: adminEmpId,
        username: 'admin',
        password_hash: password123,
        display_name: '系统管理员',
        email: 'admin@yuexiang.com',
        phone: '13800000001',
        role: 'admin',
        permissions: JSON.stringify(['*']), // 通配符表示所有权限
        data_scope: 'all',
        can_view_sensitive: true,
        status: 'active',
        is_active: true,
        created_at: now,
        updated_at: now
      });
      employees.push({
        employee_id: adminEmpId,
        employee_number: 'EMP2025001',
        name_encrypted: '系统管理员', // 简化：实际应加密
        name_hash: '系统管理员',
        department_id: adminDept?.department_id || departments[0].department_id,
        position: '系统管理员',
        employment_status: 'regular',
        email: 'admin@yuexiang.com',
        hired_date: new Date('2024-01-01'),
        data_complete: true,
        created_at: now,
        updated_at: now
      });

      // 2. HR管理员
      const hrUserId = uuidv4();
      const hrEmpId = uuidv4();
      users.push({
        user_id: hrUserId,
        employee_id: hrEmpId,
        username: 'hr_manager',
        password_hash: hrPassword,
        display_name: 'HR经理',
        email: 'hr@yuexiang.com',
        phone: '13800000002',
        role: 'hr_admin',
        permissions: JSON.stringify([
          'employees.*',
          'departments.view',
          'reports.*',
          'onboarding.*'
        ]),
        data_scope: 'all',
        can_view_sensitive: true,
        status: 'active',
        is_active: true,
        created_at: now,
        updated_at: now
      });
      employees.push({
        employee_id: hrEmpId,
        employee_number: 'EMP2025002',
        name_encrypted: 'HR经理',
        name_hash: 'HR经理',
        department_id: adminDept?.department_id || departments[0].department_id,
        position: 'HR经理',
        employment_status: 'regular',
        email: 'hr@yuexiang.com',
        hired_date: new Date('2024-02-01'),
        data_complete: true,
        created_at: now,
        updated_at: now
      });

      // 3. 生产部门经理
      const prodManagerUserId = uuidv4();
      const prodManagerEmpId = uuidv4();
      users.push({
        user_id: prodManagerUserId,
        employee_id: prodManagerEmpId,
        username: 'prod_manager',
        password_hash: pmPassword,
        display_name: '生产部经理',
        email: 'prod.manager@yuexiang.com',
        phone: '13800000003',
        role: 'department_manager',
        permissions: JSON.stringify([
          'employees.view_department',
          'employees.update_department',
          'employees.export',
          'reports.view_department'
        ]),
        department_id: productionDept?.department_id || departments[1].department_id,
        data_scope: 'department',
        can_view_sensitive: true,
        status: 'active',
        is_active: true,
        created_at: now,
        updated_at: now
      });
      employees.push({
        employee_id: prodManagerEmpId,
        employee_number: 'EMP2025003',
        name_encrypted: '李明',
        name_hash: '李明',
        department_id: productionDept?.department_id || departments[1].department_id,
        position: '生产部经理',
        employment_status: 'regular',
        email: 'prod.manager@yuexiang.com',
        hired_date: new Date('2024-03-01'),
        data_complete: true,
        created_at: now,
        updated_at: now
      });

      // 4. 销售部门经理
      const salesManagerUserId = uuidv4();
      const salesManagerEmpId = uuidv4();
      users.push({
        user_id: salesManagerUserId,
        employee_id: salesManagerEmpId,
        username: 'sales_manager',
        password_hash: smPassword,
        display_name: '销售部经理',
        email: 'sales.manager@yuexiang.com',
        phone: '13800000004',
        role: 'department_manager',
        permissions: JSON.stringify([
          'employees.view_department',
          'employees.update_department',
          'employees.export',
          'reports.view_department'
        ]),
        department_id: salesDept?.department_id || departments[2].department_id,
        data_scope: 'department',
        can_view_sensitive: true,
        status: 'active',
        is_active: true,
        created_at: now,
        updated_at: now
      });
      employees.push({
        employee_id: salesManagerEmpId,
        employee_number: 'EMP2025004',
        name_encrypted: '王芳',
        name_hash: '王芳',
        department_id: salesDept?.department_id || departments[2].department_id,
        position: '销售部经理',
        employment_status: 'regular',
        email: 'sales.manager@yuexiang.com',
        hired_date: new Date('2024-03-15'),
        data_complete: true,
        created_at: now,
        updated_at: now
      });

      // 5. 生产部普通员工
      const prodEmp1UserId = uuidv4();
      const prodEmp1EmpId = uuidv4();
      users.push({
        user_id: prodEmp1UserId,
        employee_id: prodEmp1EmpId,
        username: 'prod_emp1',
        password_hash: empPassword,
        display_name: '张伟',
        email: 'zhang.wei@yuexiang.com',
        phone: '13800000005',
        role: 'employee',
        permissions: JSON.stringify([
          'employees.view_self',
          'employees.update_self_limited'
        ]),
        data_scope: 'self',
        can_view_sensitive: true, // 可查看自己的敏感数据
        status: 'active',
        is_active: true,
        created_at: now,
        updated_at: now
      });
      employees.push({
        employee_id: prodEmp1EmpId,
        employee_number: 'EMP2025005',
        name_encrypted: '张伟',
        name_hash: '张伟',
        department_id: productionDept?.department_id || departments[1].department_id,
        position: '生产专员',
        employment_status: 'regular',
        email: 'zhang.wei@yuexiang.com',
        hired_date: new Date('2024-04-01'),
        data_complete: true,
        created_at: now,
        updated_at: now
      });

      // 6. 销售部普通员工
      const salesEmp1UserId = uuidv4();
      const salesEmp1EmpId = uuidv4();
      users.push({
        user_id: salesEmp1UserId,
        employee_id: salesEmp1EmpId,
        username: 'sales_emp1',
        password_hash: empPassword,
        display_name: '刘娟',
        email: 'liu.juan@yuexiang.com',
        phone: '13800000006',
        role: 'employee',
        permissions: JSON.stringify([
          'employees.view_self',
          'employees.update_self_limited'
        ]),
        data_scope: 'self',
        can_view_sensitive: true,
        status: 'active',
        is_active: true,
        created_at: now,
        updated_at: now
      });
      employees.push({
        employee_id: salesEmp1EmpId,
        employee_number: 'EMP2025006',
        name_encrypted: '刘娟',
        name_hash: '刘娟',
        department_id: salesDept?.department_id || departments[2].department_id,
        position: '销售专员',
        employment_status: 'regular',
        email: 'liu.juan@yuexiang.com',
        hired_date: new Date('2024-04-15'),
        data_complete: true,
        created_at: now,
        updated_at: now
      });

      // 插入员工数据（先插入，因为user表有外键依赖）
      await queryInterface.bulkInsert('employees', employees, { transaction });
      console.log(`✓ 已创建 ${employees.length} 个测试员工`);

      // 插入用户数据
      await queryInterface.bulkInsert('users', users, { transaction });
      console.log(`✓ 已创建 ${users.length} 个测试用户`);

      await transaction.commit();

      console.log('\n✅ RBAC 测试用户创建完成！');
      console.log('\n📋 测试账号信息：');
      console.log('─────────────────────────────────────────');
      console.log('角色                  | 用户名          | 密码       | 数据范围');
      console.log('─────────────────────────────────────────');
      console.log('系统管理员             | admin          | admin123  | 全部');
      console.log('HR管理员              | hr_manager     | hr123     | 全部');
      console.log('生产部经理             | prod_manager   | pm123     | 本部门');
      console.log('销售部经理             | sales_manager  | sm123     | 本部门');
      console.log('生产部员工             | prod_emp1      | emp123    | 仅自己');
      console.log('销售部员工             | sales_emp1     | emp123    | 仅自己');
      console.log('─────────────────────────────────────────\n');

    } catch (error) {
      await transaction.rollback();
      console.error('❌ RBAC 测试用户创建失败:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      console.log('开始删除 RBAC 测试用户...');

      // 删除测试用户（使用用户名匹配）
      await queryInterface.bulkDelete(
        'users',
        {
          username: {
            [Sequelize.Op.in]: [
              'admin', 'hr_manager', 'prod_manager',
              'sales_manager', 'prod_emp1', 'sales_emp1'
            ]
          }
        },
        { transaction }
      );

      // 删除测试员工（使用工号匹配）
      await queryInterface.bulkDelete(
        'employees',
        {
          employee_number: {
            [Sequelize.Op.in]: [
              'EMP2025001', 'EMP2025002', 'EMP2025003',
              'EMP2025004', 'EMP2025005', 'EMP2025006'
            ]
          }
        },
        { transaction }
      );

      await transaction.commit();
      console.log('✅ RBAC 测试用户删除完成！');

    } catch (error) {
      await transaction.rollback();
      console.error('❌ 删除失败:', error);
      throw error;
    }
  }
};
