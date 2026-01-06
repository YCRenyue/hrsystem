/**
 * Seed Data: Attendance and Leave Records
 *
 * Purpose: Create sample attendance and leave records for dashboard testing
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      console.log('Creating sample attendance and leave records...');

      // Get all active employees
      const [employees] = await queryInterface.sequelize.query(
        'SELECT employee_id FROM employees WHERE status = "active" LIMIT 32',
        { transaction }
      );

      if (employees.length === 0) {
        throw new Error('No active employees found. Please run employee seed data first.');
      }

      console.log(`Found ${employees.length} active employees`);

      // Generate attendance records for current month
      const today = new Date();
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth();
      const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

      const attendanceRecords = [];
      const { v4: uuidv4 } = require('uuid');

      // Create attendance records for each employee for each working day
      for (let day = 1; day <= Math.min(daysInMonth, today.getDate()); day++) {
        const date = new Date(currentYear, currentMonth, day);
        const dayOfWeek = date.getDay();

        // Skip weekends (0 = Sunday, 6 = Saturday)
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          continue;
        }

        for (const employee of employees) {
          // Randomly determine attendance status
          const random = Math.random();
          let status = 'normal';
          let checkInTime = '09:00:00';
          let checkOutTime = '18:00:00';
          let lateMinutes = 0;
          let earlyLeaveMinutes = 0;
          let workHours = 8.0;

          if (random < 0.85) {
            // 85% normal attendance
            status = 'normal';
          } else if (random < 0.90) {
            // 5% late
            status = 'late';
            lateMinutes = Math.floor(Math.random() * 30) + 5; // 5-35 minutes late
            const lateHours = Math.floor(lateMinutes / 60);
            const lateMins = lateMinutes % 60;
            checkInTime = `0${9 + lateHours}:${String(lateMins).padStart(2, '0')}:00`;
            workHours = 8.0 - (lateMinutes / 60);
          } else if (random < 0.93) {
            // 3% early leave
            status = 'early_leave';
            earlyLeaveMinutes = Math.floor(Math.random() * 30) + 5;
            const earlyHours = Math.floor(earlyLeaveMinutes / 60);
            const earlyMins = earlyLeaveMinutes % 60;
            checkOutTime = `${17 - earlyHours}:${String(60 - earlyMins).padStart(2, '0')}:00`;
            workHours = 8.0 - (earlyLeaveMinutes / 60);
          } else if (random < 0.96) {
            // 3% leave
            status = 'leave';
            checkInTime = null;
            checkOutTime = null;
            workHours = 0;
          } else {
            // 4% absent
            status = 'absent';
            checkInTime = null;
            checkOutTime = null;
            workHours = 0;
          }

          attendanceRecords.push({
            attendance_id: uuidv4(),
            employee_id: employee.employee_id,
            date: date.toISOString().split('T')[0],
            check_in_time: checkInTime,
            check_out_time: checkOutTime,
            status,
            late_minutes: lateMinutes,
            early_leave_minutes: earlyLeaveMinutes,
            work_hours: workHours,
            overtime_hours: 0,
            location: 'Office Building A',
            device_info: 'Mobile App',
            created_at: new Date(),
            updated_at: new Date()
          });
        }
      }

      // Insert attendance records
      if (attendanceRecords.length > 0) {
        await queryInterface.bulkInsert('attendances', attendanceRecords, { transaction });
        console.log(`Created ${attendanceRecords.length} attendance records`);
      }

      // Create leave records
      const leaveRecords = [];
      const leaveTypes = ['annual', 'sick', 'personal', 'compensatory'];
      const leaveStatuses = ['pending', 'approved', 'rejected'];

      // Get admin user for approver
      const [admins] = await queryInterface.sequelize.query(
        'SELECT user_id FROM users WHERE role = "admin" LIMIT 1',
        { transaction }
      );

      const approverId = admins.length > 0 ? admins[0].user_id : null;

      // Create 1-3 leave records per employee (randomly)
      for (const employee of employees.slice(0, 20)) { // Only first 20 employees
        const numLeaves = Math.floor(Math.random() * 3) + 1;

        for (let i = 0; i < numLeaves; i++) {
          const leaveType = leaveTypes[Math.floor(Math.random() * leaveTypes.length)];
          const status = leaveStatuses[Math.floor(Math.random() * leaveStatuses.length)];

          // Random date in current month
          const startDay = Math.floor(Math.random() * Math.min(daysInMonth - 3, 25)) + 1;
          const leaveDays = Math.floor(Math.random() * 3) + 1; // 1-3 days

          const startDate = new Date(currentYear, currentMonth, startDay);
          const endDate = new Date(currentYear, currentMonth, startDay + leaveDays - 1);

          leaveRecords.push({
            leave_id: uuidv4(),
            employee_id: employee.employee_id,
            leave_type: leaveType,
            start_date: startDate.toISOString().split('T')[0],
            end_date: endDate.toISOString().split('T')[0],
            days: leaveDays,
            reason: `${leaveType === 'sick' ? 'Medical reasons' : leaveType === 'annual' ? 'Vacation' : 'Personal matters'}`,
            status,
            approver_id: status === 'pending' ? null : approverId,
            approved_at: status === 'pending' ? null : new Date(),
            approval_notes: status === 'approved' ? 'Approved' : status === 'rejected' ? 'Not approved' : null,
            created_at: new Date(),
            updated_at: new Date()
          });
        }
      }

      // Insert leave records
      if (leaveRecords.length > 0) {
        await queryInterface.bulkInsert('leaves', leaveRecords, { transaction });
        console.log(`Created ${leaveRecords.length} leave records`);
      }

      await transaction.commit();
      console.log('Attendance and leave seed data created successfully!');
    } catch (error) {
      await transaction.rollback();
      console.error('Failed to create attendance and leave seed data:', error);
      throw error;
    }
  },

  async down(queryInterface, _Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      console.log('Deleting attendance and leave seed data...');

      await queryInterface.bulkDelete('leaves', null, { transaction });
      await queryInterface.bulkDelete('attendances', null, { transaction });

      await transaction.commit();
      console.log('Attendance and leave seed data deleted successfully!');
    } catch (error) {
      await transaction.rollback();
      console.error('Failed to delete seed data:', error);
      throw error;
    }
  }
};
