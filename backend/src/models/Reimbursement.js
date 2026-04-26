/**
 * Reimbursement Model - 出差报销单模型
 *
 * 与 BusinessTrip 一对多（一次出差可能多次报销，但通常一次）。
 * 状态机：draft → pending → approved/rejected → paid（财务发放）。
 *           pending/approved 可以撤销 → cancelled。
 * 限额校验、发票上传、明细汇总放在 ReimbursementService。
 */

const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class Reimbursement extends Model {
  /**
   * 是否锁定（不可直接编辑明细）
   */
  isLocked() {
    return ['approved', 'paid', 'cancelled'].includes(this.status);
  }

  /**
   * 是否可撤销
   */
  isCancellable() {
    return ['pending', 'approved'].includes(this.status);
  }
}

Reimbursement.init(
  {
    reimbursement_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: '报销单ID'
    },
    reimbursement_number: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      comment: '报销单号'
    },
    employee_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'employees', key: 'employee_id' },
      comment: '报销人'
    },
    trip_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'business_trip_applications', key: 'trip_id' },
      comment: '关联出差单'
    },
    total_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      comment: '总金额'
    },
    currency: {
      type: DataTypes.STRING(8),
      allowNull: false,
      defaultValue: 'CNY',
      comment: '币种'
    },
    status: {
      type: DataTypes.ENUM(
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
      type: DataTypes.UUID,
      references: { model: 'users', key: 'user_id' }
    },
    submitted_at: { type: DataTypes.DATE },
    approver_id: {
      type: DataTypes.UUID,
      references: { model: 'users', key: 'user_id' }
    },
    approved_at: { type: DataTypes.DATE },
    approval_notes: { type: DataTypes.TEXT },
    paid_by: {
      type: DataTypes.UUID,
      references: { model: 'users', key: 'user_id' }
    },
    paid_at: { type: DataTypes.DATE },
    payment_reference: { type: DataTypes.STRING(100) },
    cancelled_at: { type: DataTypes.DATE },
    cancelled_by: {
      type: DataTypes.UUID,
      references: { model: 'users', key: 'user_id' }
    },
    cancellation_reason: { type: DataTypes.TEXT },
    notes: { type: DataTypes.TEXT }
  },
  {
    sequelize,
    modelName: 'Reimbursement',
    tableName: 'reimbursements',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['employee_id'], name: 'idx_reimbursements_employee' },
      { fields: ['trip_id'], name: 'idx_reimbursements_trip' },
      { fields: ['status'], name: 'idx_reimbursements_status' },
      { fields: ['approver_id'], name: 'idx_reimbursements_approver' }
    ]
  }
);

module.exports = Reimbursement;
