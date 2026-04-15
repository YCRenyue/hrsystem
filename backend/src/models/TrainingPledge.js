const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * TrainingPledge Model
 * Stores per-employee training commitment details set by HR.
 * One record per employee (UNIQUE constraint on employee_id).
 */
class TrainingPledge extends Model {}

TrainingPledge.init(
  {
    pledge_id: {
      type: DataTypes.STRING(36),
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
      comment: 'UUID primary key'
    },
    employee_id: {
      type: DataTypes.STRING(36),
      allowNull: false,
      unique: true,
      references: {
        model: 'employees',
        key: 'employee_id'
      },
      comment: 'One-to-one relationship with employees'
    },
    training_cost: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Total training cost in CNY (yuan)'
    },
    service_years: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Required service period in years after training completion'
    },
    party_a_name: {
      type: DataTypes.STRING(200),
      allowNull: true,
      comment: 'Party A name captured at signing time'
    },
    party_a_address: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'Party A address captured at signing time'
    },
    employee_gender: {
      type: DataTypes.STRING(10),
      allowNull: true,
      comment: 'Employee gender captured at signing time'
    },
    employee_id_card: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Employee ID card number captured at signing time'
    },
    employee_household_address: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'Employee household address captured at signing time'
    },
    employee_current_address: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'Employee current address captured at signing time'
    },
    contract_sign_date: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Contract sign date text captured at signing time'
    },
    contract_start_date: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Contract start date text captured at signing time'
    },
    contract_end_date: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Contract end date text captured at signing time'
    }
  },
  {
    sequelize,
    tableName: 'training_pledges',
    underscored: true,
    timestamps: true
  }
);

module.exports = TrainingPledge;
