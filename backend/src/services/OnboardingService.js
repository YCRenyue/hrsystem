/**
 * Onboarding Service
 * 入职流程自动化服务
 */

const Employee = require('../models/Employee');
const OnboardingProcess = require('../models/OnboardingProcess');
const NotificationService = require('./NotificationService');
const logger = require('../utils/logger');

class OnboardingService {
  constructor() {
    this.notificationService = new NotificationService();
    this.baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  }

  /**
   * 创建入职流程
   * @param {string} employeeId - 员工ID
   * @returns {Promise<Object>} 创建结果
   */
  async createProcess(employeeId) {
    try {
      const employee = await Employee.findByPk(employeeId);

      if (!employee) {
        throw new Error('Employee not found');
      }

      const process = await OnboardingProcess.create({
        employee_id: employeeId,
        status: 'pending',
        created_by: 'system'
      });

      process.generateFormToken();
      process.generateFormLink(this.baseUrl);
      await process.save();

      logger.info('Onboarding process created', {
        processId: process.process_id,
        employeeId
      });

      return {
        success: true,
        process,
        formLink: process.form_link
      };
    } catch (error) {
      logger.error('Failed to create onboarding process', {
        employeeId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 发送入职表单给员工
   * @param {string} processId - 流程ID
   * @returns {Promise<Object>} 发送结果
   */
  async sendFormToEmployee(processId) {
    try {
      const process = await this._findProcessWithEmployee(processId);

      if (!process) {
        throw new Error('Onboarding process not found');
      }

      if (!process.employee) {
        throw new Error('Employee not found');
      }

      const result = await this.notificationService.sendOnboardingNotification(
        process.employee,
        process.form_link
      );

      await process.markAsSent(
        result.channel || 'manual',
        result.success,
        result.error
      );

      return {
        success: result.success,
        channel: result.channel,
        message: result.success ? '发送成功' : '发送失败'
      };
    } catch (error) {
      logger.error('Failed to send onboarding form', {
        processId,
        error: error.message
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 提交入职表单
   * @param {string} token - 表单令牌
   * @param {Object} formData - 表单数据
   * @returns {Promise<Object>} 提交结果
   */
  async submitForm(token, formData) {
    try {
      const process = await this._findProcessByToken(token);

      if (!process) {
        throw new Error('Invalid or expired token');
      }

      if (process.isTokenExpired()) {
        await process.markAsExpired();
        throw new Error('Form token has expired');
      }

      if (process.isCompleted()) {
        throw new Error('Form already submitted');
      }

      const employee = await Employee.findByPk(process.employee_id);

      if (!employee) {
        throw new Error('Employee not found');
      }

      await this._updateEmployeeData(employee, formData);

      await process.markAsCompleted(formData);

      logger.info('Onboarding form submitted', {
        processId: process.process_id,
        employeeId: employee.employee_id
      });

      return {
        success: true,
        message: '提交成功'
      };
    } catch (error) {
      logger.error('Failed to submit onboarding form', {
        token,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 获取流程状态
   * @param {string} processId - 流程ID
   * @returns {Promise<Object>} 流程状态
   */
  async getProcessStatus(processId) {
    const process = await this._findProcessWithEmployee(processId);

    if (!process) {
      throw new Error('Process not found');
    }

    return process.toSafeObject();
  }

  /**
   * 查找流程（包含员工信息）
   * @private
   */
  async _findProcessWithEmployee(processId) {
    return await OnboardingProcess.findOne({
      where: { process_id: processId },
      include: [{ model: Employee, as: 'employee' }]
    });
  }

  /**
   * 根据令牌查找流程
   * @private
   */
  async _findProcessByToken(token) {
    return await OnboardingProcess.findOne({
      where: { form_token: token }
    });
  }

  /**
   * 更新员工数据
   * @private
   */
  async _updateEmployeeData(employee, formData) {
    const updateFields = this._extractUpdateFields(formData);

    Object.keys(updateFields).forEach((key) => {
      if (this._isEncryptedField(key)) {
        const setterMethod = this._getSetterMethod(key);
        employee[setterMethod](updateFields[key]);
      } else {
        employee[key] = updateFields[key];
      }
    });

    await employee.save();
  }

  /**
   * 提取可更新字段
   * @private
   */
  _extractUpdateFields(formData) {
    const allowedFields = [
      'phone', 'email', 'idCard', 'bankCard',
      'birthDate', 'gender', 'address',
      'emergency_contact', 'emergency_phone'
    ];

    const updates = {};
    allowedFields.forEach((field) => {
      if (formData[field] !== undefined) {
        updates[field] = formData[field];
      }
    });

    return updates;
  }

  /**
   * 检查是否为加密字段
   * @private
   */
  _isEncryptedField(field) {
    const encryptedFields = ['phone', 'idCard', 'bankCard', 'birthDate'];
    return encryptedFields.includes(field);
  }

  /**
   * 获取字段的setter方法名
   * @private
   */
  _getSetterMethod(field) {
    const methodMap = {
      phone: 'setPhone',
      idCard: 'setIdCard',
      bankCard: 'setBankCard',
      birthDate: 'setBirthDate'
    };
    return methodMap[field];
  }
}

module.exports = OnboardingService;
