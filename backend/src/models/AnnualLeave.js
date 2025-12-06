const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * AnnualLeave Model
 * Stores employee annual leave records
 */
class AnnualLeave extends Model {}

AnnualLeave.init(
  {
    leave_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
      comment: 'Annual leave record ID'
    },
    employee_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'employees',
        key: 'employee_id'
      },
      comment: 'Employee ID (foreign key)'
    },
    year: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 2000,
        max: 2100
      },
      comment: 'Year for annual leave'
    },
    total_days: {
      type: DataTypes.DECIMAL(5, 1),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      },
      comment: 'Total annual leave days entitled'
    },
    used_days: {
      type: DataTypes.DECIMAL(5, 1),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      },
      comment: 'Annual leave days used'
    },
    remaining_days: {
      type: DataTypes.DECIMAL(5, 1),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      },
      comment: 'Remaining annual leave days'
    },
    carry_over_days: {
      type: DataTypes.DECIMAL(5, 1),
      allowNull: true,
      defaultValue: 0,
      validate: {
        min: 0
      },
      comment: 'Days carried over from previous year'
    },
    expiry_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Expiry date for carried over days'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Additional notes'
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
  },
  {
    sequelize,
    modelName: 'AnnualLeave',
    tableName: 'annual_leave',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['employee_id', 'year'],
        name: 'idx_annual_leave_employee_year'
      }
    ]
  }
);

module.exports = AnnualLeave;
