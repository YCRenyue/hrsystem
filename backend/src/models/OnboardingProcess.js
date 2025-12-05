const { DataTypes, Model } = require('sequelize');
const crypto = require('crypto');
const { sequelize } = require('../config/database');

/**
 * OnboardingProcess Model
 * Manages employee onboarding workflow and form submission
 */
class OnboardingProcess extends Model {
  /**
   * Generate unique form token for secure access
   * @returns {string} Generated token
   */
  generateFormToken() {
    const token = crypto.randomBytes(32).toString('hex');
    this.form_token = token;

    // Set token expiration (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    this.token_expires_at = expiresAt;

    return token;
  }

  /**
   * Generate form link with token
   * @param {string} baseUrl - Base URL of the application
   * @returns {string} Complete form URL
   */
  generateFormLink(baseUrl) {
    if (!this.form_token) {
      this.generateFormToken();
    }

    const formUrl = `${baseUrl}/onboarding/form/${this.form_token}`;
    this.form_link = formUrl;
    return formUrl;
  }

  /**
   * Check if form token is expired
   * @returns {boolean} True if token has expired
   */
  isTokenExpired() {
    if (!this.token_expires_at) return true;
    return new Date() > new Date(this.token_expires_at);
  }

  /**
   * Check if onboarding process is completed
   * @returns {boolean} True if completed
   */
  isCompleted() {
    return this.status === 'completed';
  }

  /**
   * Mark process as sent
   * @param {string} channel - Push channel used (dingtalk, sms, email, manual)
   * @param {boolean} success - Whether push was successful
   * @param {string} error - Error message if failed
   */
  async markAsSent(channel, success = true, error = null) {
    this.status = success ? 'sent' : 'pending';
    this.push_channel = channel;
    this.push_time = new Date();
    this.push_status = success ? 'success' : 'failed';
    this.push_error = error;
    await this.save();
  }

  /**
   * Mark process as completed with submitted data
   * @param {Object} submittedData - Data submitted by employee
   */
  async markAsCompleted(submittedData) {
    this.status = 'completed';
    this.completed_at = new Date();
    this.submitted_data = submittedData;
    await this.save();
  }

  /**
   * Mark process as expired
   */
  async markAsExpired() {
    if (this.isTokenExpired() && this.status !== 'completed') {
      this.status = 'expired';
      await this.save();
    }
  }

  /**
   * Check if process needs reminder
   * @returns {boolean} True if reminder is needed
   */
  needsReminder() {
    if (this.status !== 'sent') return false;
    if (this.isCompleted()) return false;
    if (this.isTokenExpired()) return false;

    // Send reminder if sent more than 3 days ago and not completed
    if (this.push_time) {
      const daysSincePush = (new Date() - new Date(this.push_time)) / (1000 * 60 * 60 * 24);
      return daysSincePush >= 3;
    }

    return false;
  }

  /**
   * Get time remaining until token expiration
   * @returns {Object} Object with days, hours, minutes remaining
   */
  getTimeRemaining() {
    if (!this.token_expires_at) return null;

    const now = new Date();
    const expiry = new Date(this.token_expires_at);
    const diff = expiry - now;

    if (diff <= 0) {
      return { expired: true };
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return {
      expired: false, days, hours, minutes
    };
  }

  /**
   * Get safe process data for API response
   * @returns {Object} Safe process data
   */
  toSafeObject() {
    return {
      process_id: this.process_id,
      employee_id: this.employee_id,
      status: this.status,
      form_link: this.form_link,
      token_expires_at: this.token_expires_at,
      push_channel: this.push_channel,
      push_time: this.push_time,
      push_status: this.push_status,
      completed_at: this.completed_at,
      time_remaining: this.getTimeRemaining(),
      needs_reminder: this.needsReminder(),
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}

OnboardingProcess.init(
  {
    process_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: '流程ID'
    },
    employee_id: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: '员工ID',
      references: {
        model: 'employees',
        key: 'employee_id'
      }
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'pending',
      comment: '状态',
      validate: {
        isIn: {
          args: [['pending', 'sent', 'completed', 'expired']],
          msg: 'Invalid status'
        }
      }
    },
    form_token: {
      type: DataTypes.STRING(100),
      allowNull: true,
      unique: true,
      comment: '表单访问令牌'
    },
    form_link: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: '表单访问链接'
    },
    token_expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '令牌过期时间'
    },
    push_channel: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: '推送渠道',
      validate: {
        isIn: {
          args: [['dingtalk', 'sms', 'email', 'manual']],
          msg: 'Invalid push channel'
        }
      }
    },
    push_time: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '推送时间'
    },
    push_status: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: '推送状态',
      validate: {
        isIn: {
          args: [['success', 'failed']],
          msg: 'Invalid push status'
        }
      }
    },
    push_error: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '推送错误信息'
    },
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '完成时间'
    },
    submitted_data: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: '提交的数据'
    },
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
    }
  },
  {
    sequelize,
    modelName: 'OnboardingProcess',
    tableName: 'onboarding_processes',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    comment: '入职流程表',
    indexes: [
      {
        name: 'idx_employee_id',
        fields: ['employee_id']
      },
      {
        name: 'idx_status',
        fields: ['status']
      },
      {
        name: 'idx_form_token',
        fields: ['form_token']
      },
      {
        name: 'idx_created_at',
        fields: ['created_at']
      }
    ]
  }
);

module.exports = OnboardingProcess;
