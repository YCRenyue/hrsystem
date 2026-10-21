/**
 * PunchCardMapping Model - 打卡机工号与员工的对照表
 *
 * 打卡机工号与花名册编号是两套体系，考勤机和食堂机之间的工号也不一致，
 * 姓名还可能有错别字。HR 在此维护「设备 + 机器工号 -> 员工」的对照，
 * 导入时优先按对照表匹配，没有对照再按姓名匹配。
 */

const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class PunchCardMapping extends Model {}

PunchCardMapping.init(
  {
    mapping_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: '对照记录ID'
    },
    device_type: {
      type: DataTypes.ENUM('attendance', 'canteen'),
      allowNull: false,
      comment: '打卡设备：attendance-考勤机, canteen-食堂机'
    },
    external_id: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: '打卡机上的工号'
    },
    external_name: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: '打卡机上登记的姓名（仅供核对）'
    },
    employee_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'employees', key: 'employee_id' },
      comment: '对应的员工ID'
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: '创建人用户ID'
    }
  },
  {
    sequelize,
    modelName: 'PunchCardMapping',
    tableName: 'punch_card_mappings',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['device_type', 'external_id'],
        name: 'idx_punch_card_mappings_device_external'
      },
      { fields: ['employee_id'], name: 'idx_punch_card_mappings_employee' }
    ]
  }
);

module.exports = PunchCardMapping;
