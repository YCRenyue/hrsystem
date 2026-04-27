/**
 * Migration: Create In-App Notifications and Reimbursement Tables
 *
 * 第二期新增：
 *   1. notifications - 站内通知（替代钉钉审批通知，呈现在网页右上角通知信箱）
 *   2. reimbursements / reimbursement_items - 出差报销单及明细
 *
 * 说明：
 *   - 通知接收对象为 user，sender_user_id 为空表示系统自动发送
 *   - 报销单严格关联出差单（trip_id 不可为空）
 *   - 明细按报销类别分项录入，发票存 OSS key
 *   - 出差申请的 reimbursement_status 字段在第一期已落库，此处不再变更
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // ---------- notifications ----------
    await queryInterface.createTable('notifications', {
      notification_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        comment: '通知ID'
      },
      recipient_user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'user_id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: '接收人用户ID'
      },
      sender_user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'user_id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: '发送人用户ID（系统自动时为空）'
      },
      type: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: '通知类型 business_trip_submitted/business_trip_approved/...'
      },
      title: {
        type: Sequelize.STRING(200),
        allowNull: false,
        comment: '标题'
      },
      content: {
        type: Sequelize.TEXT,
        comment: '正文（纯文本，可含\\n换行）'
      },
      related_resource: {
        type: Sequelize.STRING(50),
        comment: '关联资源类型 business_trip/reimbursement/attendance'
      },
      related_id: {
        type: Sequelize.STRING(36),
        comment: '关联资源 ID'
      },
      link_url: {
        type: Sequelize.STRING(500),
        comment: '前端跳转路径，例如 /business-trips/:id'
      },
      is_read: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: '是否已读'
      },
      read_at: {
        type: Sequelize.DATE,
        comment: '已读时间'
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
      comment: '站内通知表（右上角通知信箱）'
    });

    await queryInterface.addIndex('notifications', ['recipient_user_id', 'is_read'], {
      name: 'idx_notifications_recipient_unread'
    });
    await queryInterface.addIndex('notifications', ['created_at'], {
      name: 'idx_notifications_created'
    });
    await queryInterface.addIndex('notifications', ['type'], {
      name: 'idx_notifications_type'
    });

    // ---------- reimbursements ----------
    await queryInterface.createTable('reimbursements', {
      reimbursement_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        comment: '报销单ID'
      },
      reimbursement_number: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true,
        comment: '报销单号（系统生成 RBYYYYMMDDxxxx）'
      },
      employee_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'employees', key: 'employee_id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        comment: '报销人员工ID'
      },
      trip_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'business_trip_applications', key: 'trip_id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        comment: '关联出差单（必须为已批准状态）'
      },
      total_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        comment: '总金额（明细汇总）'
      },
      currency: {
        type: Sequelize.STRING(8),
        allowNull: false,
        defaultValue: 'CNY',
        comment: '币种'
      },
      status: {
        type: Sequelize.ENUM(
          'draft',
          'pending',
          'approved',
          'rejected',
          'paid',
          'cancelled'
        ),
        allowNull: false,
        defaultValue: 'draft',
        comment: '报销单状态'
      },
      submitted_by: {
        type: Sequelize.UUID,
        references: { model: 'users', key: 'user_id' },
        comment: '提交人'
      },
      submitted_at: {
        type: Sequelize.DATE,
        comment: '提交时间'
      },
      approver_id: {
        type: Sequelize.UUID,
        references: { model: 'users', key: 'user_id' },
        comment: '审核人（财务/HR）'
      },
      approved_at: {
        type: Sequelize.DATE,
        comment: '审核时间'
      },
      approval_notes: {
        type: Sequelize.TEXT,
        comment: '审核意见'
      },
      paid_by: {
        type: Sequelize.UUID,
        references: { model: 'users', key: 'user_id' },
        comment: '发放操作人'
      },
      paid_at: {
        type: Sequelize.DATE,
        comment: '发放时间'
      },
      payment_reference: {
        type: Sequelize.STRING(100),
        comment: '发放凭证号（银行流水/转账单号）'
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
      notes: {
        type: Sequelize.TEXT,
        comment: '备注'
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
      comment: '出差报销单'
    });

    await queryInterface.addIndex('reimbursements', ['employee_id'], {
      name: 'idx_reimbursements_employee'
    });
    await queryInterface.addIndex('reimbursements', ['trip_id'], {
      name: 'idx_reimbursements_trip'
    });
    await queryInterface.addIndex('reimbursements', ['status'], {
      name: 'idx_reimbursements_status'
    });
    await queryInterface.addIndex('reimbursements', ['approver_id'], {
      name: 'idx_reimbursements_approver'
    });

    // ---------- reimbursement_items ----------
    await queryInterface.createTable('reimbursement_items', {
      item_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        comment: '明细ID'
      },
      reimbursement_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'reimbursements', key: 'reimbursement_id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: '所属报销单'
      },
      category: {
        type: Sequelize.ENUM(
          'transport',
          'accommodation',
          'meal',
          'local_transport',
          'other'
        ),
        allowNull: false,
        comment: '类别：交通/住宿/餐费/市内交通/其他'
      },
      amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        comment: '金额'
      },
      occurred_on: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        comment: '发生日期（必须落在出差期间）'
      },
      description: {
        type: Sequelize.STRING(500),
        comment: '说明（如车次、酒店、餐厅）'
      },
      invoice_key: {
        type: Sequelize.STRING(500),
        comment: '发票文件 OSS key'
      },
      invoice_name: {
        type: Sequelize.STRING(200),
        comment: '发票文件原始名称'
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
      comment: '报销单明细'
    });

    await queryInterface.addIndex('reimbursement_items', ['reimbursement_id'], {
      name: 'idx_reimbursement_items_reimbursement'
    });
    await queryInterface.addIndex('reimbursement_items', ['category'], {
      name: 'idx_reimbursement_items_category'
    });
    await queryInterface.addIndex('reimbursement_items', ['occurred_on'], {
      name: 'idx_reimbursement_items_date'
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('reimbursement_items');
    await queryInterface.dropTable('reimbursements');
    await queryInterface.dropTable('notifications');
  }
};
