/**
 * Migration: Create Attendance and Leave Tables
 * Creates attendances and leaves tables for employee attendance and leave management
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create attendances table
    await queryInterface.createTable('attendances', {
      attendance_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        comment: 'Attendance record ID'
      },
      employee_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'employees',
          key: 'employee_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Employee ID'
      },
      date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        comment: 'Attendance date'
      },
      check_in_time: {
        type: Sequelize.TIME,
        comment: 'Check-in time'
      },
      check_out_time: {
        type: Sequelize.TIME,
        comment: 'Check-out time'
      },
      status: {
        type: Sequelize.ENUM('normal', 'late', 'early_leave', 'absent', 'leave', 'holiday', 'weekend'),
        defaultValue: 'normal',
        comment: 'Attendance status'
      },
      late_minutes: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: 'Late minutes'
      },
      early_leave_minutes: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: 'Early leave minutes'
      },
      work_hours: {
        type: Sequelize.DECIMAL(4, 1),
        comment: 'Work hours'
      },
      overtime_hours: {
        type: Sequelize.DECIMAL(4, 1),
        defaultValue: 0,
        comment: 'Overtime hours'
      },
      notes: {
        type: Sequelize.TEXT,
        comment: 'Notes'
      },
      location: {
        type: Sequelize.STRING(200),
        comment: 'Check-in location'
      },
      device_info: {
        type: Sequelize.STRING(200),
        comment: 'Device information'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    }, {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
      comment: 'Employee attendance records table'
    });

    // Add indexes for attendances
    await queryInterface.addIndex('attendances', ['employee_id']);
    await queryInterface.addIndex('attendances', ['date']);
    await queryInterface.addIndex('attendances', ['status']);
    await queryInterface.addIndex('attendances', ['employee_id', 'date'], {
      unique: true,
      name: 'idx_attendances_employee_date'
    });

    // Create leaves table
    await queryInterface.createTable('leaves', {
      leave_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        comment: 'Leave record ID'
      },
      employee_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'employees',
          key: 'employee_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Employee ID'
      },
      leave_type: {
        type: Sequelize.ENUM('annual', 'sick', 'personal', 'compensatory', 'maternity', 'paternity', 'marriage', 'bereavement', 'other'),
        allowNull: false,
        comment: 'Leave type'
      },
      start_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        comment: 'Start date'
      },
      end_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        comment: 'End date'
      },
      days: {
        type: Sequelize.DECIMAL(4, 1),
        allowNull: false,
        comment: 'Leave days'
      },
      reason: {
        type: Sequelize.TEXT,
        comment: 'Leave reason'
      },
      status: {
        type: Sequelize.ENUM('pending', 'approved', 'rejected', 'cancelled'),
        defaultValue: 'pending',
        comment: 'Leave status'
      },
      approver_id: {
        type: Sequelize.UUID,
        references: {
          model: 'users',
          key: 'user_id'
        },
        comment: 'Approver user ID'
      },
      approved_at: {
        type: Sequelize.DATE,
        comment: 'Approval time'
      },
      approval_notes: {
        type: Sequelize.TEXT,
        comment: 'Approval notes'
      },
      attachment_url: {
        type: Sequelize.STRING(500),
        comment: 'Attachment URL'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    }, {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
      comment: 'Employee leave records table'
    });

    // Add indexes for leaves
    await queryInterface.addIndex('leaves', ['employee_id']);
    await queryInterface.addIndex('leaves', ['leave_type']);
    await queryInterface.addIndex('leaves', ['status']);
    await queryInterface.addIndex('leaves', ['start_date', 'end_date']);
  },

  down: async (queryInterface, _Sequelize) => {
    // Drop tables in reverse order
    await queryInterface.dropTable('leaves');
    await queryInterface.dropTable('attendances');
  }
};
