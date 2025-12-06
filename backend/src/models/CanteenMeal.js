const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * CanteenMeal Model
 * Stores employee canteen meal records
 */
class CanteenMeal extends Model {}

CanteenMeal.init(
  {
    meal_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
      comment: 'Meal record ID'
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
    meal_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: 'Meal date'
    },
    meal_type: {
      type: DataTypes.ENUM('breakfast', 'lunch', 'dinner'),
      allowNull: false,
      comment: 'Meal type'
    },
    location: {
      type: DataTypes.STRING(200),
      allowNull: true,
      comment: 'Meal location'
    },
    location_type: {
      type: DataTypes.ENUM('canteen', 'external'),
      allowNull: false,
      defaultValue: 'canteen',
      comment: 'Location type'
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      },
      comment: 'Meal amount'
    },
    subsidy_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      },
      comment: 'Subsidy amount'
    },
    payment_method: {
      type: DataTypes.ENUM('cash', 'card', 'mobile_pay', 'subsidy'),
      allowNull: false,
      defaultValue: 'subsidy',
      comment: 'Payment method'
    },
    is_subsidized: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether subsidy is applied'
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
    modelName: 'CanteenMeal',
    tableName: 'canteen_meal',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['employee_id', 'meal_date', 'meal_type'],
        name: 'idx_canteen_meal_employee_date_type'
      },
      {
        fields: ['meal_date'],
        name: 'idx_canteen_meal_date'
      }
    ]
  }
);

module.exports = CanteenMeal;
