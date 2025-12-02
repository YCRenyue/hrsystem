/**
 * Sensitive Data Handler Middleware
 *
 * 自动处理API响应中的敏感数据，根据用户权限进行加密、解密或脱敏
 */

const permissionService = require('../services/PermissionService');
const logger = require('../utils/logger');

/**
 * 响应拦截器中间件
 * 自动处理响应数据中的敏感字段
 *
 * @param {Object} options - 配置选项
 * @param {boolean} options.autoMask - 是否自动脱敏（默认true）
 * @param {Array<string>} options.excludePaths - 排除的路径（不处理敏感数据）
 * @returns {Function} Express middleware
 */
function sensitiveDataHandler(options = {}) {
  const {
    autoMask = true,
    excludePaths = ['/api/auth/login', '/api/health']
  } = options;

  return (req, res, next) => {
    // 检查是否在排除路径中
    if (excludePaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    // 保存原始的json方法
    const originalJson = res.json.bind(res);

    // 重写json方法
    res.json = function(data) {
      try {
        // 只处理成功的响应且包含data字段
        if (data && data.success && data.data) {
          const user = req.user;
          const canViewSensitive = req.canViewSensitive || false;

          // 处理敏感数据
          if (autoMask) {
            data.data = processSensitiveData(data.data, user, canViewSensitive);
          }
        }
      } catch (error) {
        logger.error('Error processing sensitive data in response:', error.message);
        // 如果处理失败，继续返回原始数据
      }

      // 调用原始的json方法
      return originalJson(data);
    };

    next();
  };
}

/**
 * 递归处理数据中的敏感字段
 *
 * @private
 * @param {*} data - 要处理的数据
 * @param {Object} user - 当前用户
 * @param {boolean} canViewSensitive - 是否可以查看敏感数据
 * @returns {*} 处理后的数据
 */
function processSensitiveData(data, user, canViewSensitive) {
  if (!data) {
    return data;
  }

  // 如果是数组，递归处理每个元素
  if (Array.isArray(data)) {
    return data.map(item => processSensitiveData(item, user, canViewSensitive));
  }

  // 如果是对象，处理敏感字段
  if (typeof data === 'object') {
    // 检查是否是员工数据对象（包含敏感字段）
    if (hasSensitiveFields(data)) {
      return permissionService.processSensitiveFields(
        data,
        canViewSensitive,
        'mask'
      );
    }

    // 递归处理对象的所有属性
    const processed = {};
    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        processed[key] = processSensitiveData(data[key], user, canViewSensitive);
      }
    }
    return processed;
  }

  // 其他类型直接返回
  return data;
}

/**
 * 检查对象是否包含敏感字段
 *
 * @private
 * @param {Object} obj - 要检查的对象
 * @returns {boolean} 是否包含敏感字段
 */
function hasSensitiveFields(obj) {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  const sensitiveFieldIndicators = [
    'id_card_encrypted',
    'phone_encrypted',
    'bank_account_encrypted',
    'emergency_contact_phone_encrypted'
  ];

  return sensitiveFieldIndicators.some(field => field in obj);
}

/**
 * 手动处理单个员工数据的敏感字段
 * 用于控制器中需要手动处理的场景
 *
 * @param {Object} employeeData - 员工数据
 * @param {Object} user - 当前用户
 * @param {boolean} canViewSensitive - 是否可以查看敏感数据
 * @returns {Object} 处理后的员工数据
 */
function processEmployeeSensitiveData(employeeData, user, canViewSensitive = false) {
  if (!employeeData) {
    return null;
  }

  return permissionService.processSensitiveFields(
    employeeData,
    canViewSensitive,
    'mask'
  );
}

/**
 * 手动处理员工列表的敏感字段
 *
 * @param {Array<Object>} employees - 员工列表
 * @param {Object} user - 当前用户
 * @param {boolean} canViewSensitive - 是否可以查看敏感数据
 * @returns {Array<Object>} 处理后的员工列表
 */
function processEmployeeListSensitiveData(employees, user, canViewSensitive = false) {
  if (!Array.isArray(employees)) {
    return [];
  }

  return permissionService.processEmployeeList(employees, canViewSensitive);
}

module.exports = {
  sensitiveDataHandler,
  processEmployeeSensitiveData,
  processEmployeeListSensitiveData
};
