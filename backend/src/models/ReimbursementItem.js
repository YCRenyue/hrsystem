/**
 * ReimbursementItem Model - 报销单明细
 *
 * 每个明细对应一笔费用（一张发票）：交通/住宿/餐费/市内交通/其他。
 * 限额校验（按天住宿/餐补上限）在 ReimbursementService 中实现。
 */

const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class ReimbursementItem extends Model {}

ReimbursementItem.init(
  {
    item_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    reimbursement_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'reimbursements', key: 'reimbursement_id' }
    },
    category: {
      type: DataTypes.ENUM(
        'transport',
        'accommodation',
        'meal',
        'local_transport',
        'other'
      ),
      allowNull: false,
      comment: '类别'
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    occurred_on: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: '发生日期'
    },
    description: { type: DataTypes.STRING(500) },
    invoice_key: { type: DataTypes.STRING(500) },
    invoice_name: { type: DataTypes.STRING(200) }
  },
  {
    sequelize,
    modelName: 'ReimbursementItem',
    tableName: 'reimbursement_items',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['reimbursement_id'], name: 'idx_reimbursement_items_reimbursement' },
      { fields: ['category'], name: 'idx_reimbursement_items_category' },
      { fields: ['occurred_on'], name: 'idx_reimbursement_items_date' }
    ]
  }
);

module.exports = ReimbursementItem;
