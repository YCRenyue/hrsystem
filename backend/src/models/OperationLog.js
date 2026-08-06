/**
 * OperationLog Model - 敏感操作审计日志
 *
 * 记录对敏感数据（员工 PII、用户权限）的创建/修改/删除/导出等操作，
 * 用于合规审计与事后追责。
 *
 * 安全约束：old_values / new_values 中禁止写入解密后的敏感明文
 * （身份证、手机号、银行卡等），仅记录字段名、编号、部门、状态等元信息。
 */

const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class OperationLog extends Model {}

OperationLog.init(
  {
    log_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: '日志ID'
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: '操作人用户ID（系统操作时为空）'
    },
    operation_type: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: '操作类型 create/update/delete/export/role_change/password_reset'
    },
    table_name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: '目标数据表'
    },
    record_id: {
      type: DataTypes.STRING(64),
      allowNull: true,
      comment: '目标记录ID'
    },
    old_values: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: '变更前元信息（不含敏感明文）'
    },
    new_values: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: '变更后元信息（不含敏感明文）'
    },
    ip_address: {
      type: DataTypes.STRING(64),
      allowNull: true,
      comment: '操作来源IP'
    }
  },
  {
    sequelize,
    modelName: 'OperationLog',
    tableName: 'operation_logs',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: false,
    indexes: [
      { fields: ['user_id'], name: 'idx_operation_logs_user' },
      { fields: ['table_name'], name: 'idx_operation_logs_table' },
      { fields: ['operation_type'], name: 'idx_operation_logs_type' },
      { fields: ['created_at'], name: 'idx_operation_logs_created' }
    ]
  }
);

module.exports = OperationLog;
