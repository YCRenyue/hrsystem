/**
 * BusinessTrip Model - 出差申请模型
 *
 * 管理员工出差申请的全生命周期：
 *   pending → approved/rejected → in_progress → completed
 *   pending/approved → cancelled（撤销）
 *
 * 与考勤模块联动：审批通过后将出差期间的考勤状态置为 business_trip，
 * 并通过 attendances.business_trip_id 建立反向关联，便于撤销时回溯原状态。
 */

const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class BusinessTrip extends Model {
  /**
   * 判断申请是否已锁定（不允许直接编辑，需先撤销）
   * @returns {boolean}
   */
  isLocked() {
    return ['approved', 'in_progress', 'completed'].includes(this.status);
  }

  /**
   * 解析附件 JSON 列
   * @returns {Array<{key: string, name: string, type: string, uploaded_at: string}>}
   */
  getAttachments() {
    if (!this.attachments) return [];
    try {
      return JSON.parse(this.attachments);
    } catch {
      return [];
    }
  }
}

BusinessTrip.init(
  {
    trip_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: '出差申请ID'
    },
    employee_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'employees', key: 'employee_id' },
      comment: '员工ID'
    },
    trip_number: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      comment: '出差单号'
    },
    start_datetime: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: '出差开始时间'
    },
    end_datetime: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: '出差结束时间'
    },
    destination: {
      type: DataTypes.STRING(200),
      allowNull: false,
      comment: '目的地'
    },
    itinerary: {
      type: DataTypes.TEXT,
      comment: '行程说明'
    },
    purpose: {
      type: DataTypes.TEXT,
      comment: '出差事由'
    },
    transport: {
      type: DataTypes.STRING(50),
      comment: '主要交通方式'
    },
    duration_hours: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: false,
      defaultValue: 0,
      comment: '出差总时长（小时）'
    },
    work_hours: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: false,
      defaultValue: 0,
      comment: '计入工时统计的小时数'
    },
    span_days: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
      comment: '跨越的自然天数'
    },
    attachments: {
      type: DataTypes.TEXT,
      comment: '附件 JSON 数组'
    },
    status: {
      type: DataTypes.ENUM(
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
      type: DataTypes.UUID,
      references: { model: 'users', key: 'user_id' },
      comment: '提交人'
    },
    submitted_at: {
      type: DataTypes.DATE,
      comment: '提交时间'
    },
    approver_id: {
      type: DataTypes.UUID,
      references: { model: 'users', key: 'user_id' },
      comment: '审批人'
    },
    approved_at: {
      type: DataTypes.DATE,
      comment: '审批时间'
    },
    approval_notes: {
      type: DataTypes.TEXT,
      comment: '审批意见'
    },
    cancelled_at: {
      type: DataTypes.DATE,
      comment: '撤销时间'
    },
    cancelled_by: {
      type: DataTypes.UUID,
      references: { model: 'users', key: 'user_id' },
      comment: '撤销操作人'
    },
    cancellation_reason: {
      type: DataTypes.TEXT,
      comment: '撤销原因'
    },
    reimbursement_status: {
      type: DataTypes.ENUM('not_started', 'pending', 'reimbursed'),
      allowNull: false,
      defaultValue: 'not_started',
      comment: '关联报销状态'
    }
  },
  {
    sequelize,
    modelName: 'BusinessTrip',
    tableName: 'business_trip_applications',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['employee_id'], name: 'idx_business_trip_app_employee' },
      { fields: ['start_datetime', 'end_datetime'], name: 'idx_business_trip_app_datetime' },
      { fields: ['status'], name: 'idx_business_trip_app_status' },
      { fields: ['approver_id'], name: 'idx_business_trip_app_approver' }
    ]
  }
);

BusinessTrip.associate = (models) => {
  BusinessTrip.belongsTo(models.Employee, {
    foreignKey: 'employee_id',
    as: 'employee'
  });
  BusinessTrip.belongsTo(models.User, {
    foreignKey: 'approver_id',
    as: 'approver'
  });
  BusinessTrip.belongsTo(models.User, {
    foreignKey: 'submitted_by',
    as: 'submitter'
  });
  BusinessTrip.belongsTo(models.User, {
    foreignKey: 'cancelled_by',
    as: 'canceller'
  });
};

module.exports = BusinessTrip;
