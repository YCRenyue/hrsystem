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
