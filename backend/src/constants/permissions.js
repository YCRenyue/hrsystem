/**
 * Permission Constants
 *
 * 定义系统中所有权限常量，用于细粒度的访问控制
 *
 * 权限命名规范：<resource>.<action>_<scope>
 * - resource: 资源类型（employees, departments, reports, users）
 * - action: 操作类型（view, create, update, delete, export）
 * - scope: 范围（可选：all, department, self）
 */

/**
 * 员工信息管理权限
 */
const EMPLOYEE_PERMISSIONS = {
  // 查看权限
  VIEW_ALL: 'employees.view_all',
  VIEW_DEPARTMENT: 'employees.view_department',
  VIEW_SELF: 'employees.view_self',

  // 创建权限
  CREATE: 'employees.create',

  // 更新权限
  UPDATE_ALL: 'employees.update_all',
  UPDATE_DEPARTMENT: 'employees.update_department',
  UPDATE_SELF_LIMITED: 'employees.update_self_limited',

  // 删除权限
  DELETE: 'employees.delete',

  // 导出权限
  EXPORT: 'employees.export',
  EXPORT_DEPARTMENT: 'employees.export_department',

  // 导入权限
  IMPORT: 'employees.import'
};

/**
 * 部门管理权限
 */
const DEPARTMENT_PERMISSIONS = {
  // 查看权限
  VIEW: 'departments.view',
  VIEW_ALL: 'departments.view_all',

  // 管理权限
  MANAGE: 'departments.manage',
  CREATE: 'departments.create',
  UPDATE: 'departments.update',
  DELETE: 'departments.delete'
};

/**
 * 报表功能权限
 */
const REPORT_PERMISSIONS = {
  // 查看报表
  VIEW_ALL: 'reports.view_all',
  VIEW_DEPARTMENT: 'reports.view_department',

  // 导出报表
  EXPORT_ALL: 'reports.export_all',
  EXPORT_DEPARTMENT: 'reports.export_department'
};

/**
 * 用户管理权限
 */
const USER_PERMISSIONS = {
  // 用户账号管理
  MANAGE: 'users.manage',
  CREATE: 'users.create',
  UPDATE: 'users.update',
  DELETE: 'users.delete',
  VIEW_ALL: 'users.view_all',

  // 角色管理
  ASSIGN_ROLE: 'users.assign_role',
  ASSIGN_DEPARTMENT: 'users.assign_department'
};

/**
 * 入职流程权限
 */
const ONBOARDING_PERMISSIONS = {
  // 入职流程管理
  MANAGE: 'onboarding.manage',
  CREATE: 'onboarding.create',
  VIEW_ALL: 'onboarding.view_all',
  UPDATE: 'onboarding.update',

  // 发送通知
  SEND_NOTIFICATION: 'onboarding.send_notification'
};

/**
 * 所有权限集合（用于admin通配符检查）
 */
const ALL_PERMISSIONS = {
  ...EMPLOYEE_PERMISSIONS,
  ...DEPARTMENT_PERMISSIONS,
  ...REPORT_PERMISSIONS,
  ...USER_PERMISSIONS,
  ...ONBOARDING_PERMISSIONS
};

/**
 * 角色默认权限映射
 */
const ROLE_PERMISSIONS_MAP = {
  admin: ['*'], // 通配符表示所有权限

  hr_admin: [
    // 员工管理
    EMPLOYEE_PERMISSIONS.VIEW_ALL,
    EMPLOYEE_PERMISSIONS.CREATE,
    EMPLOYEE_PERMISSIONS.UPDATE_ALL,
    EMPLOYEE_PERMISSIONS.DELETE,
    EMPLOYEE_PERMISSIONS.EXPORT,
    EMPLOYEE_PERMISSIONS.IMPORT,

    // 部门查看
    DEPARTMENT_PERMISSIONS.VIEW_ALL,

    // 报表
    REPORT_PERMISSIONS.VIEW_ALL,
    REPORT_PERMISSIONS.EXPORT_ALL,

    // 入职流程
    ONBOARDING_PERMISSIONS.MANAGE,
    ONBOARDING_PERMISSIONS.CREATE,
    ONBOARDING_PERMISSIONS.VIEW_ALL,
    ONBOARDING_PERMISSIONS.UPDATE,
    ONBOARDING_PERMISSIONS.SEND_NOTIFICATION
  ],

  department_manager: [
    // 员工管理（限本部门）
    EMPLOYEE_PERMISSIONS.VIEW_DEPARTMENT,
    EMPLOYEE_PERMISSIONS.UPDATE_DEPARTMENT,
    EMPLOYEE_PERMISSIONS.EXPORT_DEPARTMENT,

    // 部门查看
    DEPARTMENT_PERMISSIONS.VIEW,

    // 报表（限本部门）
    REPORT_PERMISSIONS.VIEW_DEPARTMENT,
    REPORT_PERMISSIONS.EXPORT_DEPARTMENT
  ],

  employee: [
    // 仅个人信息
    EMPLOYEE_PERMISSIONS.VIEW_SELF,
    EMPLOYEE_PERMISSIONS.UPDATE_SELF_LIMITED,

    // 查看本部门信息
    DEPARTMENT_PERMISSIONS.VIEW
  ]
};

/**
 * 检查权限字符串是否匹配
 * @param {string} requiredPermission - 需要的权限
 * @param {Array<string>} userPermissions - 用户拥有的权限列表
 * @returns {boolean} 是否有权限
 */
function hasPermission(requiredPermission, userPermissions) {
  if (!userPermissions || !Array.isArray(userPermissions)) {
    return false;
  }

  // 检查通配符（admin）
  if (userPermissions.includes('*')) {
    return true;
  }

  // 检查完全匹配
  if (userPermissions.includes(requiredPermission)) {
    return true;
  }

  // 检查通配符匹配（例如：employees.* 匹配 employees.view_all）
  const wildcardMatch = userPermissions.some(permission => {
    if (permission.endsWith('.*')) {
      const prefix = permission.slice(0, -2);
      return requiredPermission.startsWith(prefix + '.');
    }
    return false;
  });

  return wildcardMatch;
}

/**
 * 获取角色的默认权限
 * @param {string} role - 角色名称
 * @returns {Array<string>} 权限列表
 */
function getRolePermissions(role) {
  return ROLE_PERMISSIONS_MAP[role] || [];
}

module.exports = {
  // 权限分组
  EMPLOYEE_PERMISSIONS,
  DEPARTMENT_PERMISSIONS,
  REPORT_PERMISSIONS,
  USER_PERMISSIONS,
  ONBOARDING_PERMISSIONS,

  // 所有权限
  ALL_PERMISSIONS,

  // 角色权限映射
  ROLE_PERMISSIONS_MAP,

  // 工具函数
  hasPermission,
  getRolePermissions
};
