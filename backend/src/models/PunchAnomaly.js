/**
 * PunchAnomaly Model - 待 HR 复核的异常打卡
 *
 * 导入时无法自动判定的打卡（如食堂半夜刷卡、不在饭点的刷卡、
 * 请假/出差期间的刷卡）不直接计入业务数据，而是记录在此，
 * 由 HR 复核后指定为午餐/晚餐或忽略。
 */

const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class PunchAnomaly extends Model {}

PunchAnomaly.init(
  {
    anomaly_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: '异常记录ID'
    },
    device_type: {
      type: DataTypes.ENUM('attendance', 'canteen'),
      allowNull: false,
      comment: '打卡设备'
    },
    employee_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'employees', key: 'employee_id' },
      comment: '员工ID'
    },
    external_id: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: '打卡机工号'
    },
    punch_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: '打卡日期'
    },
    punch_time: {
      type: DataTypes.STRING(5),
      allowNull: false,
      comment: '打卡时间 HH:MM'
    },
    reason: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: '异常原因：outside_meal_window / on_leave_or_trip'
    },
    status: {
      type: DataTypes.ENUM('pending', 'resolved'),
      allowNull: false,
      defaultValue: 'pending',
      comment: '处理状态'
    },
    resolution: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: '处理结果：lunch / dinner / ignore'
    },
    resolved_by: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: '处理人用户ID'
    },
    resolved_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '处理时间'
    }
  },
  {
    sequelize,
    modelName: 'PunchAnomaly',
    tableName: 'punch_anomalies',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['device_type', 'employee_id', 'punch_date', 'punch_time'],
        name: 'idx_punch_anomalies_unique_punch'
      },
      { fields: ['status'], name: 'idx_punch_anomalies_status' },
      { fields: ['punch_date'], name: 'idx_punch_anomalies_date' }
    ]
  }
);

module.exports = PunchAnomaly;
