/**
 * Leave Model - 假期记录模型
 *
 * 管理员工的各类假期申请和记录
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Leave = sequelize.define('Leave', {
  leave_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    comment: '假期记录ID'
  },
  employee_id: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: '员工ID',
    references: {
      model: 'employees',
      key: 'employee_id'
    }
  },
  leave_type: {
    type: DataTypes.ENUM('annual', 'sick', 'personal', 'compensatory', 'maternity', 'paternity', 'marriage', 'bereavement', 'other'),
    allowNull: false,
    comment: '假期类型：annual-年假, sick-病假, personal-事假, compensatory-调休, maternity-产假, paternity-陪产假, marriage-婚假, bereavement-丧假, other-其他'
  },
  start_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: '开始日期'
  },
  end_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: '结束日期'
  },
  days: {
    type: DataTypes.DECIMAL(4, 1),
    allowNull: false,
    comment: '请假天数'
  },
  reason: {
    type: DataTypes.TEXT,
    comment: '请假原因'
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected', 'cancelled'),
    defaultValue: 'pending',
    comment: '状态：pending-待审批, approved-已批准, rejected-已拒绝, cancelled-已取消'
  },
  approver_id: {
    type: DataTypes.UUID,
    comment: '审批人ID',
    references: {
      model: 'users',
      key: 'user_id'
    }
  },
  approved_at: {
    type: DataTypes.DATE,
    comment: '审批时间'
  },
  approval_notes: {
    type: DataTypes.TEXT,
    comment: '审批备注'
  },
  attachment_url: {
    type: DataTypes.STRING(500),
    comment: '附件URL（如病假证明）'
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'leaves',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['employee_id']
    },
    {
      fields: ['leave_type']
    },
    {
      fields: ['status']
    },
    {
      fields: ['start_date', 'end_date']
    }
  ]
});

// 关联关系
Leave.associate = (models) => {
  Leave.belongsTo(models.Employee, {
    foreignKey: 'employee_id',
    as: 'employee'
  });

  Leave.belongsTo(models.User, {
    foreignKey: 'approver_id',
    as: 'approver'
  });
};

module.exports = Leave;
