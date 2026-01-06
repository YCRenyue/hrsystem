const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * BusinessTrip Model
 * Stores employee business trip allowance records
 */
class BusinessTrip extends Model {}

BusinessTrip.init(
  {
    trip_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
      comment: 'Business trip ID'
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
    trip_number: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      comment: 'Business trip number (unique)'
    },
    start_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: 'Trip start date'
    },
    end_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: 'Trip end date'
    },
    destination: {
      type: DataTypes.STRING(200),
      allowNull: false,
      comment: 'Trip destination'
    },
    purpose: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Trip purpose'
    },
    days: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: {
        min: 1
      },
      comment: 'Number of trip days'
    },
    transportation_allowance: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      },
      comment: 'Transportation allowance'
    },
    accommodation_allowance: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      },
      comment: 'Accommodation allowance'
    },
    meal_allowance: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      },
      comment: 'Meal allowance'
    },
    other_allowance: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      },
      comment: 'Other allowance'
    },
    total_allowance: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      },
      comment: 'Total allowance amount'
    },
    status: {
      type: DataTypes.ENUM('draft', 'pending', 'approved', 'rejected', 'paid'),
      allowNull: false,
      defaultValue: 'draft',
      comment: 'Application status'
    },
    approver_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'user_id'
      },
      comment: 'Approver user ID'
    },
    approval_date: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Approval date and time'
    },
    approval_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Approval notes'
    },
    attachments: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Attachment file paths (JSON array)'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Additional notes'
    }
  },
  {
    sequelize,
    modelName: 'BusinessTrip',
    tableName: 'business_trip_allowance',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['employee_id'],
        name: 'idx_business_trip_employee'
      },
      {
        fields: ['start_date', 'end_date'],
        name: 'idx_business_trip_dates'
      },
      {
        fields: ['status'],
        name: 'idx_business_trip_status'
      }
    ]
  }
);

module.exports = BusinessTrip;
