const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');
const { encryptionService } = require('../utils/encryption');

/**
 * EmploymentContract Model
 * Stores per-employee labor contract terms set by HR (placeholder legal text
 * is rendered on the frontend using these values) plus the employee-fillable
 * party info snapshot captured at signing time.
 * One record per employee (UNIQUE constraint on employee_id).
 */
class EmploymentContract extends Model {
  /**
   * Set encrypted employee ID card number
   * @param {string} idCard - Plain text ID card number
   */
  setEmployeeIdCard(idCard) {
    this.setDataValue('employee_id_card_encrypted', idCard ? encryptionService.encrypt(idCard) : null);
  }

  /**
   * Get decrypted employee ID card number
   * @returns {string|null} Decrypted ID card number
   */
  getEmployeeIdCard() {
    const encrypted = this.getDataValue('employee_id_card_encrypted');
    if (!encrypted) return null;

    try {
      return encryptionService.decrypt(encrypted.toString('utf8'));
    } catch (error) {
      console.error('Error decrypting employment contract ID card:', error);
      return null;
    }
  }
}

EmploymentContract.init(
  {
    contract_id: {
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
    party_a_name: {
      type: DataTypes.STRING(200),
      allowNull: true,
      comment: 'Party A (employer) name, HR-configured'
    },
    party_a_address: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'Party A (employer) address, HR-configured'
    },
    contract_type: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Contract term type (fixed-term / open-term / task-based), HR-configured'
    },
    position: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Job position covered by this contract, HR-configured'
    },
    work_location: {
      type: DataTypes.STRING(200),
      allowNull: true,
      comment: 'Work location, HR-configured'
    },
    contract_start_date: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Contract start date (display text), HR-configured'
    },
    contract_end_date: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Contract end date (display text), HR-configured'
    },
    monthly_salary: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Monthly salary in CNY, HR-configured'
    },
    employee_gender: {
      type: DataTypes.STRING(10),
      allowNull: true,
      comment: 'Employee gender captured at signing time'
    },
    employee_id_card_encrypted: {
      type: DataTypes.BLOB,
      allowNull: true,
      comment: 'Employee ID card number captured at signing time (AES-256 encrypted)'
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
    }
  },
  {
    sequelize,
    tableName: 'employment_contracts',
    underscored: true,
    timestamps: true
  }
);

module.exports = EmploymentContract;
