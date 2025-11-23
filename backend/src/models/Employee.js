const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');
const { encryptionService } = require('../utils/encryption');

/**
 * Employee Model
 * Stores employee information with encrypted sensitive fields
 */
class Employee extends Model {
  /**
   * Set encrypted name
   * @param {string} name - Plain text name
   */
  setName(name) {
    if (name) {
      this.setDataValue('name_encrypted', encryptionService.encrypt(name));
    }
  }

  /**
   * Get decrypted name
   * @returns {string} Decrypted name
   */
  getName() {
    const encrypted = this.getDataValue('name_encrypted');
    if (!encrypted) return null;

    try {
      return encryptionService.decrypt(encrypted.toString('utf8'));
    } catch (error) {
      console.error('Error decrypting name:', error);
      return null;
    }
  }

  /**
   * Set encrypted phone
   * @param {string} phone - Plain text phone number
   */
  setPhone(phone) {
    if (phone) {
      this.setDataValue('phone_encrypted', encryptionService.encrypt(phone));
    }
  }

  /**
   * Get decrypted phone
   * @returns {string} Decrypted phone number
   */
  getPhone() {
    const encrypted = this.getDataValue('phone_encrypted');
    if (!encrypted) return null;

    try {
      return encryptionService.decrypt(encrypted.toString('utf8'));
    } catch (error) {
      console.error('Error decrypting phone:', error);
      return null;
    }
  }

  /**
   * Get masked phone for display
   * @returns {string} Masked phone number
   */
  getMaskedPhone() {
    const phone = this.getPhone();
    return phone ? encryptionService.maskPhone(phone) : null;
  }

  /**
   * Set encrypted ID card
   * @param {string} idCard - Plain text ID card number
   */
  setIdCard(idCard) {
    if (idCard) {
      this.setDataValue('id_card_encrypted', encryptionService.encrypt(idCard));
    }
  }

  /**
   * Get decrypted ID card
   * @returns {string} Decrypted ID card number
   */
  getIdCard() {
    const encrypted = this.getDataValue('id_card_encrypted');
    if (!encrypted) return null;

    try {
      return encryptionService.decrypt(encrypted.toString('utf8'));
    } catch (error) {
      console.error('Error decrypting ID card:', error);
      return null;
    }
  }

  /**
   * Get masked ID card for display
   * @returns {string} Masked ID card number
   */
  getMaskedIdCard() {
    const idCard = this.getIdCard();
    return idCard ? encryptionService.maskIdCard(idCard) : null;
  }

  /**
   * Set encrypted bank card
   * @param {string} bankCard - Plain text bank card number
   */
  setBankCard(bankCard) {
    if (bankCard) {
      this.setDataValue('bank_card_encrypted', encryptionService.encrypt(bankCard));
    }
  }

  /**
   * Get decrypted bank card
   * @returns {string} Decrypted bank card number
   */
  getBankCard() {
    const encrypted = this.getDataValue('bank_card_encrypted');
    if (!encrypted) return null;

    try {
      return encryptionService.decrypt(encrypted.toString('utf8'));
    } catch (error) {
      console.error('Error decrypting bank card:', error);
      return null;
    }
  }

  /**
   * Get masked bank card for display
   * @returns {string} Masked bank card number
   */
  getMaskedBankCard() {
    const bankCard = this.getBankCard();
    return bankCard ? encryptionService.maskBankCard(bankCard) : null;
  }

  /**
   * Set encrypted birth date
   * @param {string} birthDate - Plain text birth date
   */
  setBirthDate(birthDate) {
    if (birthDate) {
      this.setDataValue('birth_date_encrypted', encryptionService.encrypt(birthDate));
    }
  }

  /**
   * Get decrypted birth date
   * @returns {string} Decrypted birth date
   */
  getBirthDate() {
    const encrypted = this.getDataValue('birth_date_encrypted');
    if (!encrypted) return null;

    try {
      return encryptionService.decrypt(encrypted.toString('utf8'));
    } catch (error) {
      console.error('Error decrypting birth date:', error);
      return null;
    }
  }

  /**
   * Calculate age from birth date
   * @returns {number|null} Age in years
   */
  getAge() {
    const birthDate = this.getBirthDate();
    if (!birthDate) return null;

    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    return age;
  }

  /**
   * Calculate work years from entry date
   * @returns {number|null} Work years
   */
  getWorkYears() {
    if (!this.entry_date) return null;

    const today = new Date();
    const entry = new Date(this.entry_date);
    const diffTime = today - entry;
    const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);

    return Math.floor(diffYears * 10) / 10; // Round to 1 decimal place
  }

  /**
   * Check if employee data is complete
   * @returns {boolean} True if all required fields are filled
   */
  isDataComplete() {
    const requiredFields = [
      this.getName(),
      this.getPhone(),
      this.getIdCard(),
      this.email,
      this.department_id,
      this.position,
      this.entry_date
    ];

    return requiredFields.every(field => field !== null && field !== undefined && field !== '');
  }

  /**
   * Get safe employee data for API response (with masked sensitive fields)
   * @param {boolean} includeSensitive - Whether to include decrypted sensitive data
   * @returns {Object} Safe employee data object
   */
  toSafeObject(includeSensitive = false) {
    const data = {
      employee_id: this.employee_id,
      employee_number: this.employee_number,
      name: includeSensitive ? this.getName() : this.getName()?.substring(0, 1) + '**',
      email: this.email,
      phone: this.getMaskedPhone(),
      id_card: this.getMaskedIdCard(),
      bank_card: this.getMaskedBankCard(),
      department_id: this.department_id,
      department: this.department, // Include department object if loaded
      position: this.position,
      employment_type: this.employment_type,
      entry_date: this.entry_date,
      probation_end_date: this.probation_end_date,
      leave_date: this.leave_date,
      status: this.status,
      gender: this.gender,
      age: this.getAge(),
      work_years: this.getWorkYears(),
      dingtalk_user_id: this.dingtalk_user_id,
      data_complete: this.isDataComplete(),
      created_at: this.created_at,
      updated_at: this.updated_at
    };

    if (includeSensitive) {
      data.phone = this.getPhone();
      data.id_card = this.getIdCard();
      data.bank_card = this.getBankCard();
      data.birth_date = this.getBirthDate();
    }

    return data;
  }
}

Employee.init(
  {
    employee_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: '员工ID'
    },
    employee_number: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      comment: '工号',
      validate: {
        notEmpty: {
          msg: 'Employee number cannot be empty'
        }
      }
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: '邮箱',
      validate: {
        isEmail: {
          msg: 'Invalid email format'
        }
      }
    },
    // Encrypted fields stored as BLOB
    name_encrypted: {
      type: DataTypes.BLOB,
      allowNull: true,
      comment: '姓名(加密)'
    },
    phone_encrypted: {
      type: DataTypes.BLOB,
      allowNull: true,
      comment: '手机号(加密)'
    },
    id_card_encrypted: {
      type: DataTypes.BLOB,
      allowNull: true,
      comment: '身份证号(加密)'
    },
    bank_card_encrypted: {
      type: DataTypes.BLOB,
      allowNull: true,
      comment: '银行卡号(加密)'
    },
    birth_date_encrypted: {
      type: DataTypes.BLOB,
      allowNull: true,
      comment: '出生日期(加密)'
    },
    // Organization info
    department_id: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: '部门ID',
      references: {
        model: 'departments',
        key: 'department_id'
      }
    },
    position: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: '职位'
    },
    employment_type: {
      type: DataTypes.STRING(20),
      defaultValue: 'full_time',
      comment: '用工类型',
      validate: {
        isIn: {
          args: [['full_time', 'part_time', 'intern', 'contract']],
          msg: 'Invalid employment type'
        }
      }
    },
    // Work info
    entry_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: '入职日期'
    },
    probation_end_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: '试用期结束日期'
    },
    leave_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: '离职日期'
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'pending',
      comment: '状态',
      validate: {
        isIn: {
          args: [['pending', 'active', 'inactive']],
          msg: 'Invalid status'
        }
      }
    },
    // DingTalk integration
    dingtalk_user_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
      unique: true,
      comment: '钉钉用户ID'
    },
    // ID card files
    id_card_front_s3_path: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: '身份证正面S3路径'
    },
    id_card_back_s3_path: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: '身份证反面S3路径'
    },
    // Other info
    gender: {
      type: DataTypes.STRING(10),
      allowNull: true,
      comment: '性别',
      validate: {
        isIn: {
          args: [['male', 'female']],
          msg: 'Invalid gender'
        }
      }
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '家庭住址'
    },
    emergency_contact: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: '紧急联系人'
    },
    emergency_phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: '紧急联系电话'
    },
    // Data completeness flag
    data_complete: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: '数据是否完整'
    },
    // Audit fields
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      comment: '创建时间'
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      comment: '更新时间'
    },
    created_by: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: '创建人'
    },
    updated_by: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: '更新人'
    }
  },
  {
    sequelize,
    modelName: 'Employee',
    tableName: 'employees',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    comment: '员工信息表',
    indexes: [
      {
        name: 'idx_employee_number',
        fields: ['employee_number']
      },
      {
        name: 'idx_department',
        fields: ['department_id']
      },
      {
        name: 'idx_status',
        fields: ['status']
      },
      {
        name: 'idx_entry_date',
        fields: ['entry_date']
      },
      {
        name: 'idx_dingtalk_user',
        fields: ['dingtalk_user_id']
      }
    ],
    hooks: {
      // Update data_complete flag before saving
      beforeSave: async (employee) => {
        employee.data_complete = employee.isDataComplete();
      }
    }
  }
);

module.exports = Employee;
