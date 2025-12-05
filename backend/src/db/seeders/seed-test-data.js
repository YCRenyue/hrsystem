/**
 * Seed Test Data - 生成测试数据
 *
 * 生成30个员工和过去12个月的考勤、请假数据
 */

const { sequelize } = require('../../config/database');
const { Employee, Department, Attendance, Leave, User } = require('../../models');
const bcrypt = require('bcryptjs');
const { encryptionService } = require('../../utils/encryption');

// 姓名数据
const firstNames = ['张', '王', '李', '赵', '刘', '陈', '杨', '黄', '周', '吴'];
const lastNames = ['伟', '芳', '娜', '秀英', '敏', '静', '丽', '强', '磊', '军', '洋', '勇', '艳', '杰', '鹏'];

// 生成随机日期
const getRandomDate = (start, end) => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

// 生成随机手机号
const generatePhone = () => {
  const prefixes = ['138', '139', '150', '151', '152', '188', '186', '185'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
  return prefix + suffix;
};

// 生成随机身份证号
const generateIdCard = () => {
  const province = '110000';
  const year = 1980 + Math.floor(Math.random() * 20);
  const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
  const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
  const suffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return province + year + month + day + suffix + 'X';
};

async function seedData() {
  try {
    console.log('开始生成测试数据...');

    // 1. 清空现有数据
    await Attendance.destroy({ where: {}, force: true });
    await Leave.destroy({ where: {}, force: true });
    await Employee.destroy({ where: {}, force: true });
    await Department.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });

    // 2. 创建部门
    console.log('创建部门...');
    const departments = await Department.bulkCreate([
      { name: '技术部', code: 'TECH', parent_id: null },
      { name: '产品部', code: 'PRODUCT', parent_id: null },
      { name: '市场部', code: 'MARKET', parent_id: null },
      { name: '人力资源部', code: 'HR', parent_id: null },
      { name: '财务部', code: 'FINANCE', parent_id: null }
    ]);

    // 3. 创建用户和员工
    console.log('创建员工数据...');
    const employees = [];
    const users = [];

    // 创建管理员用户
    const adminUser = await User.create({
      username: 'admin',
      password_hash: await bcrypt.hash('admin123', 10),
      email: 'admin@company.com',
      role: 'admin',
      data_scope: 'all',
      can_view_sensitive: true
    });
    users.push(adminUser);

    // 创建HR管理员
    const hrAdmin = await User.create({
      username: 'hr_admin',
      password_hash: await bcrypt.hash('hr123', 10),
      email: 'hr@company.com',
      role: 'hr_admin',
      data_scope: 'all',
      can_view_sensitive: true
    });
    users.push(hrAdmin);

    // 创建30个普通员工
    for (let i = 0; i < 30; i++) {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const name = firstName + lastName;
      const department = departments[i % departments.length];

      // 生成入职日期（过去1-3年内）
      const entryDate = getRandomDate(
        new Date(2022, 0, 1),
        new Date(2024, 11, 31)
      );

      const phone = generatePhone();
      const idCard = generateIdCard();
      const email = `emp${i + 1}@company.com`;

      // 创建员工记录
      const employee = await Employee.create({
        employee_number: `EMP${String(i + 1).padStart(4, '0')}`,
        name_encrypted: encryptionService.encrypt(name),
        name_hash: encryptionService.hash(name),
        phone_encrypted: encryptionService.encrypt(phone),
        phone_hash: encryptionService.hash(phone),
        id_card_encrypted: encryptionService.encrypt(idCard),
        id_card_hash: encryptionService.hash(idCard),
        email,
        department_id: department.department_id,
        position: ['工程师', '经理', '主管', '专员'][Math.floor(Math.random() * 4)],
        employment_type: 'full_time',
        entry_date: entryDate,
        status: 'active',
        data_complete: true
      });

      employees.push(employee);

      // 创建用户账号（每5个员工创建一个部门经理）
      if (i % 10 === 0) {
        const managerUser = await User.create({
          username: `manager${Math.floor(i / 10) + 1}`,
          password_hash: await bcrypt.hash('manager123', 10),
          email: `manager${Math.floor(i / 10) + 1}@company.com`,
          role: 'department_manager',
          data_scope: 'department',
          department_id: department.department_id,
          employee_id: employee.employee_id,
          can_view_sensitive: false
        });
        users.push(managerUser);
      } else {
        // 普通员工账号
        const empUser = await User.create({
          username: `emp${i + 1}`,
          password_hash: await bcrypt.hash('emp123', 10),
          email: email,
          role: 'employee',
          data_scope: 'self',
          employee_id: employee.employee_id,
          can_view_sensitive: false
        });
        users.push(empUser);
      }
    }

    console.log(`创建了 ${employees.length} 个员工`);

    // 4. 生成过去12个月的考勤数据
    console.log('生成考勤数据...');
    const attendanceRecords = [];
    const today = new Date();
    const startDate = new Date(today);
    startDate.setMonth(startDate.getMonth() - 12);

    for (const employee of employees) {
      let currentDate = new Date(startDate);

      while (currentDate <= today) {
        // 跳过周末
        if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
          // 80% 概率正常，15% 迟到，5% 缺勤
          const random = Math.random();
          let status = 'normal';
          let checkInTime = '09:00:00';
          let checkOutTime = '18:00:00';
          let lateMinutes = 0;
          let workHours = 8.0;

          if (random < 0.05) {
            // 缺勤
            status = 'absent';
            checkInTime = null;
            checkOutTime = null;
            workHours = 0;
          } else if (random < 0.20) {
            // 迟到
            status = 'late';
            lateMinutes = Math.floor(Math.random() * 60) + 10; // 10-70分钟
            const lateHour = 9 + Math.floor(lateMinutes / 60);
            const lateMin = lateMinutes % 60;
            checkInTime = `${String(lateHour).padStart(2, '0')}:${String(lateMin).padStart(2, '0')}:00`;
            workHours = 8.0 - (lateMinutes / 60);
          }

          attendanceRecords.push({
            employee_id: employee.employee_id,
            date: new Date(currentDate),
            check_in_time: checkInTime,
            check_out_time: checkOutTime,
            status,
            late_minutes: lateMinutes,
            work_hours: workHours,
            overtime_hours: Math.random() < 0.3 ? Math.floor(Math.random() * 3) : 0
          });
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    await Attendance.bulkCreate(attendanceRecords);
    console.log(`创建了 ${attendanceRecords.length} 条考勤记录`);

    // 5. 生成请假数据
    console.log('生成请假数据...');
    const leaveRecords = [];
    const leaveTypes = ['annual', 'sick', 'personal', 'compensatory'];
    const leaveStatuses = ['approved', 'rejected', 'pending'];

    for (const employee of employees) {
      // 每个员工随机生成3-8条请假记录
      const leaveCount = Math.floor(Math.random() * 6) + 3;

      for (let i = 0; i < leaveCount; i++) {
        const leaveType = leaveTypes[Math.floor(Math.random() * leaveTypes.length)];
        const startDate = getRandomDate(
          new Date(today.getFullYear() - 1, 0, 1),
          new Date()
        );

        // 请假天数1-5天
        const days = Math.floor(Math.random() * 5) + 1;
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + days - 1);

        const status = leaveStatuses[Math.floor(Math.random() * leaveStatuses.length)];

        leaveRecords.push({
          employee_id: employee.employee_id,
          leave_type: leaveType,
          start_date: startDate,
          end_date: endDate,
          days: days,
          reason: `${leaveType === 'sick' ? '身体不适' : '个人事务'}`,
          status: status,
          approver_id: status !== 'pending' ? users[1].user_id : null,
          approved_at: status !== 'pending' ? getRandomDate(startDate, new Date()) : null
        });
      }
    }

    await Leave.bulkCreate(leaveRecords);
    console.log(`创建了 ${leaveRecords.length} 条请假记录`);

    console.log('\n✅ 测试数据生成完成!');
    console.log(`
总结:
- 部门: ${departments.length}
- 员工: ${employees.length}
- 用户账号: ${users.length}
- 考勤记录: ${attendanceRecords.length}
- 请假记录: ${leaveRecords.length}

测试账号:
- 管理员: admin / admin123
- HR管理员: hr_admin / hr123
- 部门经理: manager1 / manager123 (可创建更多)
- 普通员工: emp1 / emp123 (emp1-emp30)
    `);

  } catch (error) {
    console.error('生成测试数据失败:', error);
    throw error;
  }
}

// 如果直接运行此文件
if (require.main === module) {
  seedData()
    .then(() => {
      console.log('脚本执行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = { seedData };
