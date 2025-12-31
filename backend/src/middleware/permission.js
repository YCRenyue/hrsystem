/**
 * Permission Middleware
 *
 * 提供细粒度的权限检查中间件
 * 包括：具体权限检查、数据范围过滤、部门访问控制
 */

const { hasPermission: checkPermissionUtil } = require('../constants/permissions');

/**
 * 检查用户是否有特定权限
 * @param {string} requiredPermission - 需要的权限（例如：'employees.view_all'）
 * @returns {Function} Express middleware
 *
 * @example
 * router.get('/employees', checkPermission('employees.view_all'), controller.list);
 */
exports.checkPermission = (requiredPermission) => async (req, res, next) => {
  try {
    const { user } = req;

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: '未登录或登录已过期'
      });
    }

    // 使用权限工具函数检查
    const hasAccess = checkPermissionUtil(requiredPermission, user.permissions);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: 'Permission Denied',
        message: `您没有权限执行此操作。需要权限：${requiredPermission}`,
        requiredPermission
      });
    }

    return next();
  } catch (error) {
    console.error('Permission check error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: '权限检查失败'
    });
  }
};

/**
 * 检查并应用数据范围过滤
 * 将用户的数据范围过滤条件附加到 req.dataScopeFilter
 *
 * @param {string} resourceType - 资源类型（'employee', 'department'等）
 * @returns {Function} Express middleware
 *
 * @example
 * router.get('/employees',
 *   authenticateToken,
 *   checkDataScope('employee'),
 *   controller.list
 * );
 */
exports.checkDataScope = (resourceType = 'employee') => async (req, res, next) => {
  try {
    const { user } = req;

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: '未登录或登录已过期'
      });
    }

    // 获取用户的数据范围过滤条件
    const filter = user.getDataScopeFilter(resourceType);

    // 将过滤条件附加到请求对象
    req.dataScopeFilter = filter;
    req.dataScope = user.data_scope;

    return next();
  } catch (error) {
    console.error('Data scope check error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: '数据范围检查失败'
    });
  }
};

/**
 * 检查用户是否可以访问指定部门
 * @param {string} deptIdParam - 部门ID参数名（例如：'departmentId' 或 'id'）
 * @returns {Function} Express middleware
 *
 * @example
 * router.get('/departments/:id/employees',
 *   authenticateToken,
 *   requireDepartmentAccess('id'),
 *   controller.getDepartmentEmployees
 * );
 */
exports.requireDepartmentAccess = (deptIdParam = 'departmentId') => async (req, res, next) => {
  try {
    const { user } = req;

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: '未登录或登录已过期'
      });
    }

    // 从请求参数、查询参数或请求体中获取部门ID
    const departmentId = req.params[deptIdParam]
                          || req.query[deptIdParam]
                          || req.body[deptIdParam];

    if (!departmentId) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: '缺少部门ID参数'
      });
    }

    // 检查用户是否可以访问该部门
    const canAccess = user.canAccessDepartment(departmentId);

    if (!canAccess) {
      return res.status(403).json({
        success: false,
        error: 'Permission Denied',
        message: '您没有权限访问该部门的数据'
      });
    }

    return next();
  } catch (error) {
    console.error('Department access check error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: '部门访问权限检查失败'
    });
  }
};

/**
 * 检查用户是否可以查看敏感数据
 * 将检查结果附加到 req.canViewSensitive
 *
 * @param {string} employeeIdParam - 员工ID参数名（可选）
 * @returns {Function} Express middleware
 *
 * @example
 * router.get('/employees/:id',
 *   authenticateToken,
 *   checkSensitiveDataAccess('id'),
 *   controller.getEmployee
 * );
 */
exports.checkSensitiveDataAccess = (employeeIdParam = 'id') => async (req, res, next) => {
  try {
    const { user } = req;

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: '未登录或登录已过期'
      });
    }

    // 获取目标员工ID（如果有）
    const targetEmployeeId = req.params[employeeIdParam]
                               || req.query[employeeIdParam];

    // 检查是否可以查看敏感数据
    let canView = false;
    if (targetEmployeeId) {
      canView = user.canViewSensitiveData(targetEmployeeId);
    } else {
      // 如果没有指定员工ID，根据数据范围判断
      canView = user.can_view_sensitive && user.data_scope === 'all';
    }

    // 将结果附加到请求对象
    req.canViewSensitive = canView;

    return next();
  } catch (error) {
    console.error('Sensitive data access check error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: '敏感数据访问权限检查失败'
    });
  }
};

/**
 * 组合多个权限检查
 * @param {...Function} middlewares - 多个中间件函数
 * @returns {Function} Express middleware
 *
 * @example
 * router.put('/employees/:id',
 *   authenticateToken,
 *   requirePermissions(
 *     checkPermission('employees.update_all'),
 *     checkDataScope('employee')
 *   ),
 *   controller.update
 * );
 */
exports.requirePermissions = (...middlewares) => async (req, res, next) => {
  let index = 0;

  const runNext = async (err) => {
    if (err) return next(err);

    if (index >= middlewares.length) {
      return next();
    }

    const middleware = middlewares[index++];
    try {
      await middleware(req, res, runNext);
      return undefined;
    } catch (error) {
      return next(error);
    }
  };

  return runNext();
};

/**
 * 检查用户是否可以编辑指定员工的字段
 * 将可编辑字段列表附加到 req.editableFields
 *
 * @param {string} employeeIdParam - 员工ID参数名
 * @param {Array<string>} requestedFields - 请求编辑的字段列表
 * @returns {Function} Express middleware
 */
exports.checkEditableFields = (employeeIdParam = 'id', requestedFields = []) => async (req, res, next) => {
  try {
    const { user } = req;

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: '未登录或登录已过期'
      });
    }

    const targetEmployeeId = req.params[employeeIdParam];

    if (!targetEmployeeId) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: '缺少员工ID参数'
      });
    }

    // 从请求体中提取字段列表
    const fieldsToEdit = requestedFields.length > 0
      ? requestedFields
      : Object.keys(req.body);

    // 检查可编辑字段
    const { canEdit, editableFields } = user.canEditEmployeeFields(
      targetEmployeeId,
      fieldsToEdit
    );

    if (!canEdit) {
      return res.status(403).json({
        success: false,
        error: 'Permission Denied',
        message: '您没有权限编辑该员工的信息'
      });
    }

    // 如果有不可编辑的字段，返回警告
    const nonEditableFields = fieldsToEdit.filter((f) => !editableFields.includes(f));
    if (nonEditableFields.length > 0) {
      return res.status(403).json({
        success: false,
        error: 'Permission Denied',
        message: '您没有权限编辑以下字段',
        nonEditableFields
      });
    }

    // 将可编辑字段附加到请求对象
    req.editableFields = editableFields;

    return next();
  } catch (error) {
    console.error('Editable fields check error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: '字段编辑权限检查失败'
    });
  }
};
