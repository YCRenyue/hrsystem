const BaseRepository = require('./BaseRepository');
const { Employee } = require('../models');
const { Op } = require('sequelize');

/**
 * Employee Repository
 * Handles employee-specific data operations
 */
class EmployeeRepository extends BaseRepository {
  constructor() {
    super(Employee);
  }

  /**
   * Find employee by employee number
   * @param {string} employeeNumber - Employee number
   * @returns {Promise<Employee|null>} Employee or null
   */
  async findByEmployeeNumber(employeeNumber) {
    return await this.findOne({ employee_number: employeeNumber });
  }

  /**
   * Find employee by DingTalk user ID
   * @param {string} dingtalkUserId - DingTalk user ID
   * @returns {Promise<Employee|null>} Employee or null
   */
  async findByDingtalkUserId(dingtalkUserId) {
    return await this.findOne({ dingtalk_user_id: dingtalkUserId });
  }

  /**
   * Find employees by department
   * @param {string} departmentId - Department ID
   * @param {Object} options - Query options
   * @returns {Promise<Array<Employee>>} Array of employees
   */
  async findByDepartment(departmentId, options = {}) {
    return await this.findAll({ department_id: departmentId }, options);
  }

  /**
   * Find employees by status
   * @param {string} status - Employee status
   * @param {Object} options - Query options
   * @returns {Promise<Array<Employee>>} Array of employees
   */
  async findByStatus(status, options = {}) {
    return await this.findAll({ status }, options);
  }

  /**
   * Find employees with incomplete data
   * @param {Object} options - Query options
   * @returns {Promise<Array<Employee>>} Array of employees
   */
  async findIncompleteData(options = {}) {
    return await this.findAll({ data_complete: false }, options);
  }

  /**
   * Find employees joining on specific date
   * @param {Date} date - Entry date
   * @param {Object} options - Query options
   * @returns {Promise<Array<Employee>>} Array of employees
   */
  async findByEntryDate(date, options = {}) {
    return await this.findAll({ entry_date: date }, options);
  }

  /**
   * Find employees with entry date in range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {Object} options - Query options
   * @returns {Promise<Array<Employee>>} Array of employees
   */
  async findByEntryDateRange(startDate, endDate, options = {}) {
    return await this.findAll(
      {
        entry_date: {
          [Op.between]: [startDate, endDate]
        }
      },
      options
    );
  }

  /**
   * Count employees by department
   * @param {string} departmentId - Department ID
   * @returns {Promise<number>} Count of employees
   */
  async countByDepartment(departmentId) {
    return await this.count({ department_id: departmentId });
  }

  /**
   * Count employees by status
   * @param {string} status - Employee status
   * @returns {Promise<number>} Count of employees
   */
  async countByStatus(status) {
    return await this.count({ status });
  }

  /**
   * Get employees statistics
   * @returns {Promise<Object>} Statistics object
   */
  async getStatistics() {
    const total = await this.count();
    const active = await this.countByStatus('active');
    const pending = await this.countByStatus('pending');
    const inactive = await this.countByStatus('inactive');
    const incompleteData = await this.count({ data_complete: false });

    return {
      total,
      active,
      pending,
      inactive,
      incompleteData
    };
  }

  /**
   * Create employee with encrypted fields
   * @param {Object} data - Employee data with plain text sensitive fields
   * @returns {Promise<Employee>} Created employee
   */
  async createWithEncryption(data) {
    // Prepare non-encrypted fields first
    const nonEncryptedFields = {};
    Object.keys(data).forEach(key => {
      if (!['name', 'phone', 'id_card', 'bank_card', 'birth_date'].includes(key)) {
        nonEncryptedFields[key] = data[key];
      }
    });

    // Create employee with non-encrypted fields
    const employee = await this.model.build(nonEncryptedFields);

    // Set encrypted fields using model methods
    if (data.name) employee.setName(data.name);
    if (data.phone) employee.setPhone(data.phone);
    if (data.id_card) employee.setIdCard(data.id_card);
    if (data.bank_card) employee.setBankCard(data.bank_card);
    if (data.birth_date) employee.setBirthDate(data.birth_date);

    // Save employee
    await employee.save();
    return employee;
  }

  /**
   * Update employee with encrypted fields
   * @param {string} id - Employee ID
   * @param {Object} data - Employee data with plain text sensitive fields
   * @returns {Promise<Employee|null>} Updated employee
   */
  async updateWithEncryption(id, data) {
    const employee = await this.findById(id);
    if (!employee) return null;

    // Update encrypted fields using model methods
    if (data.name) employee.setName(data.name);
    if (data.phone) employee.setPhone(data.phone);
    if (data.id_card) employee.setIdCard(data.id_card);
    if (data.bank_card) employee.setBankCard(data.bank_card);
    if (data.birth_date) employee.setBirthDate(data.birth_date);

    // Update other fields
    Object.keys(data).forEach(key => {
      if (!['name', 'phone', 'id_card', 'bank_card', 'birth_date'].includes(key)) {
        employee[key] = data[key];
      }
    });

    await employee.save();
    return employee;
  }
}

module.exports = new EmployeeRepository();
