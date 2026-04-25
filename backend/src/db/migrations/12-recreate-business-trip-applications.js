/**
 * Migration: Recreate Business Trip Applications
 *
 * 移除原有的出差补助记录表 business_trip_allowance，重建为完整的出差申请-审批-考勤联动模型。
 * 第一期范围：申请、审批、附件、考勤同步状态、工时统计、撤销回溯。
 * 报销联动放在第二期，因此本表只保留与报销关联所需的钩子字段（reimbursement_status）。
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Drop old allowance table; data will be migrated to new application table on a later
    // backfill task if needed. The system has not yet booked production data here.
    await queryInterface.dropTable('business_trip_allowance');

    await queryInterface.createTable('business_trip_applications', {
      trip_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        comment: '出差申请ID'
      },
      employee_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'employees',
          key: 'employee_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        comment: '出差员工ID'
      },
      trip_number: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true,
        comment: '出差单号（系统生成 BTYYYYMMDDxxxx）'
      },
      start_datetime: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: '出差开始时间（精确到分钟）'
      },
      end_datetime: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: '出差结束时间（精确到分钟）'
      },
      destination: {
        type: Sequelize.STRING(200),
        allowNull: false,
        comment: '出差目的地'
      },
      itinerary: {
        type: Sequelize.TEXT,
        comment: '行程说明（可包含多段：时间-地点）'
      },
      purpose: {
        type: Sequelize.TEXT,
        comment: '出差事由'
      },
      transport: {
        type: Sequelize.STRING(50),
        comment: '主要交通方式：飞机/高铁/火车/汽车/自驾/其他'
      },
      duration_hours: {
        type: Sequelize.DECIMAL(6, 2),
        allowNull: false,
        defaultValue: 0,
        comment: '出差总时长（小时，含工作日时段折算工时基准）'
      },
      work_hours: {
        type: Sequelize.DECIMAL(6, 2),
        allowNull: false,
        defaultValue: 0,
        comment: '计入工时统计的小时数（不含周末与节假日）'
      },
      span_days: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
        comment: '跨越的自然天数（首尾按比例折算）'
      },
      attachments: {
        type: Sequelize.TEXT,
        comment: '附件 JSON 数组：[{key, name, type, uploaded_at}]'
      },
      status: {
        type: Sequelize.ENUM(
          'draft',
          'pending',
          'approved',
          'rejected',
          'cancelled',
          'in_progress',
          'completed'
        ),
        allowNull: false,
        defaultValue: 'pending',
        comment: '申请状态'
      },
      submitted_by: {
        type: Sequelize.UUID,
        references: { model: 'users', key: 'user_id' },
        comment: '提交人（用户ID）'
      },
      submitted_at: {
        type: Sequelize.DATE,
        comment: '提交时间'
      },
      approver_id: {
        type: Sequelize.UUID,
        references: { model: 'users', key: 'user_id' },
        comment: '审批人（部门负责人或HR）'
      },
      approved_at: {
        type: Sequelize.DATE,
        comment: '审批时间'
      },
      approval_notes: {
        type: Sequelize.TEXT,
        comment: '审批意见'
      },
      cancelled_at: {
        type: Sequelize.DATE,
        comment: '撤销时间'
      },
      cancelled_by: {
        type: Sequelize.UUID,
        references: { model: 'users', key: 'user_id' },
        comment: '撤销操作人'
      },
      cancellation_reason: {
        type: Sequelize.TEXT,
        comment: '撤销原因'
      },
      reimbursement_status: {
        type: Sequelize.ENUM('not_started', 'pending', 'reimbursed'),
        allowNull: false,
        defaultValue: 'not_started',
        comment: '关联报销单状态（第二期开放）'
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
      comment: '出差申请表（含审批、考勤联动）'
    });

    await queryInterface.addIndex('business_trip_applications', ['employee_id'], {
      name: 'idx_business_trip_app_employee'
    });
    await queryInterface.addIndex('business_trip_applications', ['start_datetime', 'end_datetime'], {
      name: 'idx_business_trip_app_datetime'
    });
    await queryInterface.addIndex('business_trip_applications', ['status'], {
      name: 'idx_business_trip_app_status'
    });
    await queryInterface.addIndex('business_trip_applications', ['approver_id'], {
      name: 'idx_business_trip_app_approver'
    });

    // 在 attendances 上增加出差快照字段，便于撤销回溯
    // 检查列是否存在（若是首次安装则跳过）
    const tableDesc = await queryInterface.describeTable('attendances');

    if (!tableDesc.business_trip_id) {
      await queryInterface.addColumn('attendances', 'business_trip_id', {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'business_trip_applications',
          key: 'trip_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: '关联的出差申请ID（标记本日为出差）'
      });
    }

    if (!tableDesc.previous_status) {
      await queryInterface.addColumn('attendances', 'previous_status', {
        type: Sequelize.STRING(20),
        allowNull: true,
        comment: '被出差覆盖前的原状态（用于撤销回溯）'
      });
    }

    // 扩展考勤状态枚举，加入 business_trip
    await queryInterface.changeColumn('attendances', 'status', {
      type: Sequelize.ENUM(
        'normal',
        'late',
        'early_leave',
        'absent',
        'leave',
        'holiday',
        'weekend',
        'business_trip'
      ),
      defaultValue: 'normal',
      comment: '考勤状态：增加 business_trip-出差'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // 回滚考勤字段
    const tableDesc = await queryInterface.describeTable('attendances');
    if (tableDesc.business_trip_id) {
      await queryInterface.removeColumn('attendances', 'business_trip_id');
    }
    if (tableDesc.previous_status) {
      await queryInterface.removeColumn('attendances', 'previous_status');
    }

    await queryInterface.changeColumn('attendances', 'status', {
      type: Sequelize.ENUM(
        'normal',
        'late',
        'early_leave',
        'absent',
        'leave',
        'holiday',
        'weekend'
      ),
      defaultValue: 'normal',
      comment: '考勤状态'
    });

    await queryInterface.dropTable('business_trip_applications');

    // 重建原 business_trip_allowance（保留向后兼容）
    await queryInterface.createTable('business_trip_allowance', {
      trip_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      employee_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'employees', key: 'employee_id' }
      },
      trip_number: { type: Sequelize.STRING(50), unique: true },
      start_date: { type: Sequelize.DATEONLY, allowNull: false },
      end_date: { type: Sequelize.DATEONLY, allowNull: false },
      destination: { type: Sequelize.STRING(200), allowNull: false },
      purpose: Sequelize.TEXT,
      days: { type: Sequelize.INTEGER, defaultValue: 1 },
      transportation_allowance: { type: Sequelize.DECIMAL(10, 2), defaultValue: 0 },
      accommodation_allowance: { type: Sequelize.DECIMAL(10, 2), defaultValue: 0 },
      meal_allowance: { type: Sequelize.DECIMAL(10, 2), defaultValue: 0 },
      other_allowance: { type: Sequelize.DECIMAL(10, 2), defaultValue: 0 },
      total_allowance: { type: Sequelize.DECIMAL(10, 2), defaultValue: 0 },
      status: {
        type: Sequelize.ENUM('draft', 'pending', 'approved', 'rejected', 'paid'),
        defaultValue: 'draft'
      },
      approver_id: {
        type: Sequelize.UUID,
        references: { model: 'users', key: 'user_id' }
      },
      approval_date: Sequelize.DATE,
      approval_notes: Sequelize.TEXT,
      attachments: Sequelize.TEXT,
      notes: Sequelize.TEXT,
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
      collate: 'utf8mb4_unicode_ci'
    });
  }
};
