/**
 * AttendanceSummary Model - 考勤汇总模型
 *
 * 存储某个统计周期内每个员工的汇总数据，数据源自 考勤卡表 的顶部汇总区
 * （旷工/请假/出差天数，上班天数，加班小时，迟到/早退次数与分钟）。
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AttendanceSummary = sequelize.define('AttendanceSummary', {
  summary_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    comment: '考勤汇总ID'
  },
  employee_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'employees', key: 'employee_id' }
  },
  period_start: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: '统计周期开始'
  },
  period_end: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: '统计周期结束'
  },
  external_employee_number: {
    type: DataTypes.STRING(50),
    comment: '考勤表中的工号'
  },
  absent_days: {
    type: DataTypes.DECIMAL(5, 1),
    allowNull: false,
    defaultValue: 0
  },
  leave_days: {
    type: DataTypes.DECIMAL(5, 1),
    allowNull: false,
    defaultValue: 0
  },
  business_trip_days: {
    type: DataTypes.DECIMAL(5, 1),
    allowNull: false,
    defaultValue: 0
  },
  work_days: {
    type: DataTypes.DECIMAL(5, 1),
    allowNull: false,
    defaultValue: 0
  },
  overtime_normal_hours: {
    type: DataTypes.DECIMAL(6, 2),
    allowNull: false,
    defaultValue: 0
  },
  overtime_holiday_hours: {
    type: DataTypes.DECIMAL(6, 2),
    allowNull: false,
    defaultValue: 0
  },
  late_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  late_minutes: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  early_leave_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  early_leave_minutes: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  source_file: {
    type: DataTypes.STRING(255),
    comment: '来源文件名'
  },
  imported_at: {
    type: DataTypes.DATE,
    comment: '导入时间'
  }
}, {
  tableName: 'attendance_summaries',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['employee_id'] },
    { fields: ['period_start', 'period_end'] },
    {
      unique: true,
      name: 'uq_attendance_summary_employee_period',
      fields: ['employee_id', 'period_start', 'period_end']
    }
  ]
});

AttendanceSummary.associate = (models) => {
  AttendanceSummary.belongsTo(models.Employee, {
    foreignKey: 'employee_id',
    as: 'employee'
  });
};

module.exports = AttendanceSummary;
