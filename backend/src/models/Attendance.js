/**
 * Attendance Model - 考勤记录模型
 *
 * 管理员工的每日考勤打卡记录
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Attendance = sequelize.define('Attendance', {
  attendance_id: {
    type: DataTypes.STRING(36),
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
    comment: '考勤记录ID'
  },
  employee_id: {
    type: DataTypes.STRING(36),
    allowNull: false,
    comment: '员工ID',
    references: {
      model: 'employees',
      key: 'employee_id'
    }
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: '考勤日期'
  },
  check_in_time: {
    type: DataTypes.TIME,
    comment: '签到时间'
  },
  check_out_time: {
    type: DataTypes.TIME,
    comment: '签退时间'
  },
  status: {
    type: DataTypes.ENUM('normal', 'late', 'early_leave', 'absent', 'leave', 'holiday', 'weekend'),
    defaultValue: 'normal',
    comment: '考勤状态：normal-正常, late-迟到, early_leave-早退, absent-缺勤, leave-请假, holiday-节假日, weekend-周末'
  },
  late_minutes: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '迟到分钟数'
  },
  early_leave_minutes: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '早退分钟数'
  },
  work_hours: {
    type: DataTypes.DECIMAL(4, 1),
    comment: '工作时长（小时）'
  },
  overtime_hours: {
    type: DataTypes.DECIMAL(4, 1),
    defaultValue: 0,
    comment: '加班时长（小时）'
  },
  notes: {
    type: DataTypes.TEXT,
    comment: '备注'
  },
  location: {
    type: DataTypes.STRING(200),
    comment: '打卡地点'
  },
  device_info: {
    type: DataTypes.STRING(200),
    comment: '打卡设备信息'
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
  tableName: 'attendances',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['employee_id']
    },
    {
      fields: ['date']
    },
    {
      fields: ['status']
    },
    {
      unique: true,
      fields: ['employee_id', 'date']
    }
  ]
});

// 关联关系
Attendance.associate = (models) => {
  Attendance.belongsTo(models.Employee, {
    foreignKey: 'employee_id',
    as: 'employee'
  });
};

module.exports = Attendance;
