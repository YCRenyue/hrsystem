const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * SocialSecurity Model
 * Stores employee social security and housing fund records
 */
class SocialSecurity extends Model {}

SocialSecurity.init(
  {
    security_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
      comment: 'Social security record ID'
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
    year_month: {
      type: DataTypes.STRING(7),
      allowNull: false,
      validate: {
        is: /^\d{4}-\d{2}$/
      },
      comment: 'Year and month (YYYY-MM)'
    },
    social_security_base: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      },
      comment: 'Social security base amount'
    },
    housing_fund_base: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      },
      comment: 'Housing fund base amount'
    },
    pension_personal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Pension insurance (personal)'
    },
    pension_company: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Pension insurance (company)'
    },
    medical_personal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Medical insurance (personal)'
    },
    medical_company: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Medical insurance (company)'
    },
    unemployment_personal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Unemployment insurance (personal)'
    },
    unemployment_company: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Unemployment insurance (company)'
    },
    injury_company: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Work injury insurance (company only)'
    },
    maternity_company: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Maternity insurance (company only)'
    },
    housing_fund_personal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Housing fund (personal)'
    },
    housing_fund_company: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Housing fund (company)'
    },
    total_personal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Total personal contribution'
    },
    total_company: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Total company contribution'
    },
    payment_status: {
      type: DataTypes.ENUM('pending', 'paid', 'failed'),
      allowNull: false,
      defaultValue: 'pending',
      comment: 'Payment status'
    },
    payment_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Payment date'
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
    modelName: 'SocialSecurity',
    tableName: 'social_security',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['employee_id', 'year_month'],
        name: 'idx_social_security_employee_month'
      }
    ]
  }
);

module.exports = SocialSecurity;
