/**
 * Permission Service
 *
 * 统一处理权限检查、数据范围过滤和敏感数据脱敏
 */

const { encryptionService } = require('../utils/encryption');
const logger = require('../utils/logger');

class PermissionService {
  /**
   * 根据用户权限应用数据范围过滤
   *
   * @param {Object} user - 当前用户对象
   * @param {string} resourceType - 资源类型 (employee|department|leave|attendance)
   * @param {Object} additionalFilters - 额外的筛选条件
   * @returns {Object} Sequelize where条件对象
   */
  applyDataScopeFilter(user, resourceType = 'employee', additionalFilters = {}) {
    const where = { ...additionalFilters };

    if (!user || !user.data_scope) {
      logger.warn('User or data_scope is missing');
      return where;
    }

    switch (user.data_scope) {
      case 'all':
        // Admin/HR可以访问所有数据
        // 如果有额外的部门筛选，应用它
        logger.debug(`Data scope: all - User ${user.user_id} can access all ${resourceType}`);
        break;

      case 'department':
        // 部门经理只能访问本部门数据
        if (resourceType === 'employee') {
          where.department_id = user.department_id;
        } else if (resourceType === 'department') {
          where.department_id = user.department_id;
        }
        logger.debug(`Data scope: department - User ${user.user_id} restricted to department ${user.department_id}`);
        break;

      case 'self':
        // 普通员工只能访问自己的数据
        if (resourceType === 'employee') {
          where.employee_id = user.employee_id;
        } else {
          // 对于其他资源类型，也限制为本人
          where.employee_id = user.employee_id;
        }
        logger.debug(`Data scope: self - User ${user.user_id} restricted to own data`);
        break;

      default:
        logger.warn(`Unknown data scope: ${user.data_scope}`);
        // 默认为最严格的权限（只能查看自己）
        where.employee_id = user.employee_id;
    }

    return where;
  }

  /**
   * 检查用户是否可以查看敏感数据
   *
   * @param {Object} user - 当前用户对象
   * @param {string} targetEmployeeId - 目标员工ID（可选）
   * @returns {boolean} 是否有权限查看敏感数据
   */
  canViewSensitiveData(user, targetEmployeeId = null) {
    if (!user) {
      return false;
    }

    // Admin 和 HR 可以查看所有敏感数据
    if (user.data_scope === 'all' && user.can_view_sensitive) {
      return true;
    }

    // 部门经理可以查看本部门员工的敏感数据（需要额外检查）
    if (user.data_scope === 'department' && user.can_view_sensitive) {
      // 如果指定了目标员工，需要验证该员工是否在同一部门
      // 这里返回true，实际验证在业务逻辑中进行
      return true;
    }

    // 员工可以查看自己的敏感数据
    if (targetEmployeeId && user.employee_id === targetEmployeeId) {
      return true;
    }

    return false;
  }

  /**
   * 处理敏感数据字段（加密或脱敏）
   *
   * @param {Object} employeeData - 员工数据对象
   * @param {boolean} canViewSensitive - 是否可以查看敏感数据
   * @param {string} action - 动作类型 ('encrypt'|'decrypt'|'mask')
   * @returns {Object} 处理后的员工数据
   */
  processSensitiveFields(employeeData, canViewSensitive = false, action = 'mask') {
    if (!employeeData) {
      return null;
    }

    const sensitiveFields = [
      'id_card',
      'phone',
      'bank_account',
      'emergency_contact_phone'
    ];

    const processedData = { ...employeeData };

    sensitiveFields.forEach(field => {
      const encryptedField = `${field}_encrypted`;
      const value = employeeData[field];
      const encryptedValue = employeeData[encryptedField];

      if (action === 'encrypt' && value) {
        // 加密明文数据
        try {
          processedData[encryptedField] = encryptionService.encrypt(value);
          delete processedData[field]; // 删除明文字段
        } catch (error) {
          logger.error(`Failed to encrypt ${field}:`, error.message);
          throw new Error(`加密${field}失败`);
        }
      } else if (action === 'decrypt' && encryptedValue) {
        // 解密数据
        if (canViewSensitive) {
          try {
            processedData[field] = encryptionService.decrypt(encryptedValue);
            delete processedData[encryptedField];
          } catch (error) {
            logger.error(`Failed to decrypt ${field}:`, error.message);
            processedData[field] = null;
          }
        } else {
          // 无权限查看，进行脱敏
          processedData[field] = this._maskField(field, encryptedValue);
          delete processedData[encryptedField];
        }
      } else if (action === 'mask' && encryptedValue) {
        // 脱敏显示
        try {
          if (canViewSensitive) {
            processedData[field] = encryptionService.decrypt(encryptedValue);
          } else {
            const decrypted = encryptionService.decrypt(encryptedValue);
            processedData[field] = this._maskFieldValue(field, decrypted);
          }
          delete processedData[encryptedField];
        } catch (error) {
          logger.error(`Failed to process ${field}:`, error.message);
          processedData[field] = this._getMaskedPlaceholder(field);
          delete processedData[encryptedField];
        }
      }
    });

    return processedData;
  }

  /**
   * 脱敏字段值
   *
   * @private
   * @param {string} fieldName - 字段名称
   * @param {string} value - 原始值
   * @returns {string} 脱敏后的值
   */
  _maskFieldValue(fieldName, value) {
    if (!value) {
      return '';
    }

    switch (fieldName) {
      case 'phone':
      case 'emergency_contact_phone':
        return encryptionService.maskPhone(value);

      case 'id_card':
        return encryptionService.maskIdCard(value);

      case 'bank_account':
        return encryptionService.maskBankCard(value);

      default:
        // 默认脱敏：显示前3位和后4位
        if (value.length > 7) {
          return value.substring(0, 3) + '****' + value.substring(value.length - 4);
        }
        return '****';
    }
  }

  /**
   * 获取脱敏占位符
   *
   * @private
   * @param {string} fieldName - 字段名称
   * @returns {string} 占位符
   */
  _getMaskedPlaceholder(fieldName) {
    switch (fieldName) {
      case 'phone':
      case 'emergency_contact_phone':
        return '***-****-****';

      case 'id_card':
        return '***************';

      case 'bank_account':
        return '**** **** **** ****';

      default:
        return '****';
    }
  }

  /**
   * 批量处理员工列表的敏感数据
   *
   * @param {Array<Object>} employees - 员工列表
   * @param {boolean} canViewSensitive - 是否可以查看敏感数据
   * @returns {Array<Object>} 处理后的员工列表
   */
  processEmployeeList(employees, canViewSensitive = false) {
    if (!Array.isArray(employees)) {
      return [];
    }

    return employees.map(employee => {
      return this.processSensitiveFields(employee, canViewSensitive, 'mask');
    });
  }

  /**
   * 验证数据访问权限
   *
   * @param {Object} user - 当前用户
   * @param {Object} targetResource - 目标资源（员工、部门等）
   * @param {string} resourceType - 资源类型
   * @returns {boolean} 是否有访问权限
   */
  canAccessResource(user, targetResource, resourceType = 'employee') {
    if (!user || !targetResource) {
      return false;
    }

    // Admin/HR 可以访问所有资源
    if (user.data_scope === 'all') {
      return true;
    }

    // 部门经理可以访问本部门的资源
    if (user.data_scope === 'department') {
      if (resourceType === 'employee' || resourceType === 'leave' || resourceType === 'attendance') {
        return targetResource.department_id === user.department_id;
      }
      if (resourceType === 'department') {
        return targetResource.department_id === user.department_id;
      }
    }

    // 员工只能访问自己的资源
    if (user.data_scope === 'self') {
      if (resourceType === 'employee') {
        return targetResource.employee_id === user.employee_id;
      }
      // 对于假期、考勤等资源，检查employee_id
      return targetResource.employee_id === user.employee_id;
    }

    return false;
  }

  /**
   * 获取可编辑字段列表
   *
   * @param {Object} user - 当前用户
   * @param {string} targetEmployeeId - 目标员工ID
   * @returns {Object} { canEdit: boolean, editableFields: Array<string> }
   */
  getEditableFields(user, targetEmployeeId) {
    if (!user || !targetEmployeeId) {
      return { canEdit: false, editableFields: [] };
    }

    // Admin/HR 可以编辑所有字段
    if (user.data_scope === 'all') {
      return {
        canEdit: true,
        editableFields: [
          'name', 'gender', 'date_of_birth', 'id_card', 'phone', 'email',
          'address', 'department_id', 'position', 'employment_type',
          'entry_date', 'probation_end_date', 'status', 'bank_account',
          'emergency_contact', 'emergency_contact_phone'
        ]
      };
    }

    // 部门经理可以编辑本部门员工的部分字段
    if (user.data_scope === 'department') {
      return {
        canEdit: true,
        editableFields: [
          'position', 'email', 'phone', 'address',
          'emergency_contact', 'emergency_contact_phone'
        ]
      };
    }

    // 员工只能编辑自己的有限字段
    if (user.employee_id === targetEmployeeId) {
      return {
        canEdit: true,
        editableFields: [
          'phone', 'email', 'address',
          'emergency_contact', 'emergency_contact_phone'
        ]
      };
    }

    return { canEdit: false, editableFields: [] };
  }

  /**
   * 创建用于Sequelize查询的include配置（包含权限过滤）
   *
   * @param {Object} user - 当前用户
   * @param {string} resourceType - 资源类型
   * @returns {Array} Sequelize include配置数组
   */
  getPermissionFilteredInclude(user, resourceType = 'employee') {
    const { Employee, Department } = require('../models');

    const include = [];

    // 根据资源类型和用户权限构建include
    if (resourceType === 'leave' || resourceType === 'attendance') {
      const employeeWhere = this.applyDataScopeFilter(user, 'employee');

      include.push({
        model: Employee,
        as: 'employee',
        where: employeeWhere,
        attributes: ['employee_id', 'employee_number', 'name', 'department_id'],
        include: [
          {
            model: Department,
            as: 'department',
            attributes: ['department_id', 'name']
          }
        ]
      });
    }

    return include;
  }
}

// Export singleton instance
module.exports = new PermissionService();
