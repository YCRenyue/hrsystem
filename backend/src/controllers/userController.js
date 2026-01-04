/**
 * User Controller - User management operations
 */

const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { User, Employee, Department } = require('../models');
const _permissionService = require('../services/PermissionService');

/**
 * Default password for password reset
 */
const DEFAULT_PASSWORD = '123456';

/**
 * Get current user profile
 */
const getUserProfile = async (req, res) => {
  const user = await User.findByPk(req.user.user_id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: '用户不存在'
    });
  }

  let employee = null;
  if (user.employee_id) {
    employee = await Employee.findByPk(user.employee_id, {
      include: [
        {
          model: Department,
          as: 'department',
          attributes: ['department_id', 'name', 'code']
        }
      ]
    });
  }

  // Return safe objects with masked sensitive data
  const userData = user.toSafeObject();
  const employeeData = employee ? employee.toSafeObject(false) : null;

  return res.json({
    success: true,
    data: {
      user: userData,
      employee: employeeData
    }
  });
};

/**
 * Update user profile
 */
const updateUserProfile = async (req, res) => {
  const {
    email, emergency_contact, emergency_phone, address, display_name, username,
    status: _status, role: _role
  } = req.body;

  // Check for restricted fields
  const restrictedFields = ['status', 'role', 'employee_number', 'department_id'];
  const attemptedFields = Object.keys(req.body);
  const hasRestrictedField = attemptedFields.some((field) => restrictedFields.includes(field));

  if (hasRestrictedField) {
    return res.status(403).json({
      success: false,
      message: '无法修改受限字段'
    });
  }

  // Validate email format if provided
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({
      success: false,
      message: '邮箱格式不正确'
    });
  }

  // Validate username if provided
  if (username !== undefined) {
    if (username.length < 3 || username.length > 50) {
      return res.status(400).json({
        success: false,
        message: '用户名长度必须在3到50个字符之间'
      });
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return res.status(400).json({
        success: false,
        message: '用户名只能包含字母、数字和下划线'
      });
    }
    // Check if username is already taken
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser && existingUser.user_id !== req.user.user_id) {
      return res.status(400).json({
        success: false,
        message: '用户名已被使用'
      });
    }
  }

  // Validate display_name if provided
  if (display_name !== undefined && display_name.length > 100) {
    return res.status(400).json({
      success: false,
      message: '显示名称不能超过100个字符'
    });
  }

  // Build update object with only the fields that need to be updated
  const updateFields = {};
  if (email !== undefined) updateFields.email = email;
  if (display_name !== undefined) updateFields.display_name = display_name;
  if (username !== undefined) updateFields.username = username;

  // Only update if there are fields to update
  if (Object.keys(updateFields).length > 0) {
    await User.update(updateFields, {
      where: { user_id: req.user.user_id }
    });
  }

  // Fetch updated user for response
  const user = await User.findByPk(req.user.user_id);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: '用户不存在'
    });
  }

  // Update employee fields if exists
  if (user.employee_id) {
    const employee = await Employee.findByPk(user.employee_id);
    if (employee) {
      if (email !== undefined) employee.email = email;
      if (emergency_contact !== undefined) employee.emergency_contact = emergency_contact;
      if (emergency_phone !== undefined) employee.emergency_phone = emergency_phone;
      if (address !== undefined) employee.address = address;
      await employee.save();
    }
  }

  // Always return user data to reflect any user field changes (like username)
  return res.json({
    success: true,
    message: '个人资料更新成功',
    data: user.toSafeObject()
  });
};

/**
 * Change password
 */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: '请输入当前密码和新密码'
      });
    }

    const user = await User.scope('withPassword').findByPk(req.user.user_id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: '当前密码不正确'
      });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    user.password_hash = newPasswordHash;
    await user.save();

    return res.json({
      success: true,
      message: '密码修改成功'
    });
  } catch (error) {
    console.error('Error changing password:', error);
    return res.status(500).json({
      success: false,
      message: '密码修改失败'
    });
  }
};

/**
 * Get user preferences
 */
const getUserPreferences = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.user_id, {
      attributes: ['preferences']
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // Return preferences or default values
    const preferences = user.preferences || {
      fontSize: 'medium',
      backgroundColor: '#ffffff',
      primaryColor: '#1890ff'
    };

    return res.json({
      success: true,
      data: preferences
    });
  } catch (error) {
    console.error('Error getting user preferences:', error);
    return res.status(500).json({
      success: false,
      message: '获取用户偏好设置失败'
    });
  }
};

/**
 * Update user preferences
 */
const updateUserPreferences = async (req, res) => {
  try {
    const {
      fontSize, backgroundColor, primaryColor, theme, language
    } = req.body;

    const user = await User.findByPk(req.user.user_id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // Update preferences
    const preferences = {
      fontSize: fontSize || 'medium',
      backgroundColor: backgroundColor || '#ffffff',
      primaryColor: primaryColor || '#1890ff',
      theme: theme || 'light',
      language: language || 'zh-CN'
    };

    user.preferences = preferences;
    await user.save();

    return res.json({
      success: true,
      message: '偏好设置更新成功',
      data: preferences
    });
  } catch (error) {
    console.error('Error updating user preferences:', error);
    return res.status(500).json({
      success: false,
      message: '更新用户偏好设置失败'
    });
  }
};

/**
 * Get current user's employee information
 */
const getProfileEmployee = async (req, res) => {
  const user = await User.findByPk(req.user.user_id);

  if (!user || !user.employee_id) {
    return res.status(404).json({
      success: false,
      message: '员工信息不存在'
    });
  }

  const employee = await Employee.findByPk(user.employee_id, {
    include: [
      {
        model: Department,
        as: 'department',
        attributes: ['department_id', 'name', 'code', 'level']
      }
    ]
  });

  if (!employee) {
    return res.status(404).json({
      success: false,
      message: '员工不存在'
    });
  }

  // Return employee with full information but masked sensitive data
  const employeeData = employee.toSafeObject(false);

  return res.json({
    success: true,
    data: employeeData
  });
};

/**
 * Get paginated list of all users (Admin only)
 */
const getUsers = async (req, res) => {
  const {
    page = 1,
    size = 10,
    keyword,
    role,
    status,
    sort_by = 'created_at',
    sort_order = 'DESC'
  } = req.query;

  const offset = (parseInt(page, 10) - 1) * parseInt(size, 10);
  const limit = parseInt(size, 10);

  // Build where clause
  const where = {};

  if (keyword) {
    where[Op.or] = [
      { username: { [Op.like]: `%${keyword}%` } },
      { display_name: { [Op.like]: `%${keyword}%` } },
      { email: { [Op.like]: `%${keyword}%` } }
    ];
  }

  if (role) {
    where.role = role;
  }

  if (status) {
    where.status = status;
  }

  // Build order clause
  const validSortFields = ['username', 'role', 'status', 'created_at', 'last_login_at'];
  const sortField = validSortFields.includes(sort_by) ? sort_by : 'created_at';
  const sortDirection = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const { count, rows } = await User.findAndCountAll({
    where,
    include: [
      {
        model: Employee,
        as: 'employee',
        attributes: ['employee_id', 'employee_number', 'position'],
        include: [
          {
            model: Department,
            as: 'department',
            attributes: ['department_id', 'name']
          }
        ]
      }
    ],
    offset,
    limit,
    order: [[sortField, sortDirection]]
  });

  // Convert to safe objects
  const safeUsers = rows.map((user) => {
    const userData = user.toSafeObject();
    if (user.employee) {
      userData.employee = {
        employee_id: user.employee.employee_id,
        employee_number: user.employee.employee_number,
        position: user.employee.position,
        department: user.employee.department
      };
    }
    return userData;
  });

  res.json({
    success: true,
    data: {
      items: safeUsers,
      total: count,
      page: parseInt(page, 10),
      size: parseInt(size, 10),
      totalPages: Math.ceil(count / parseInt(size, 10))
    }
  });
};

/**
 * Get single user by ID (Admin only)
 */
const getUserById = async (req, res) => {
  const { id } = req.params;

  const user = await User.findByPk(id, {
    include: [
      {
        model: Employee,
        as: 'employee',
        attributes: ['employee_id', 'employee_number', 'position'],
        include: [
          {
            model: Department,
            as: 'department',
            attributes: ['department_id', 'name']
          }
        ]
      }
    ]
  });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: '用户不存在'
    });
  }

  const userData = user.toSafeObject();
  if (user.employee) {
    userData.employee = {
      employee_id: user.employee.employee_id,
      employee_number: user.employee.employee_number,
      position: user.employee.position,
      department: user.employee.department
    };
  }

  return res.json({
    success: true,
    data: userData
  });
};

/**
 * Update user role and permissions (Admin only)
 */
const updateUserRole = async (req, res) => {
  const { id } = req.params;
  const {
    role, data_scope, can_view_sensitive, status
  } = req.body;

  const user = await User.findByPk(id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: '用户不存在'
    });
  }

  // Prevent modifying admin's own role
  if (user.user_id === req.user.user_id && role && role !== user.role) {
    return res.status(403).json({
      success: false,
      message: '不能修改自己的角色'
    });
  }

  // Validate role
  const validRoles = ['admin', 'hr_admin', 'department_manager', 'employee'];
  if (role && !validRoles.includes(role)) {
    return res.status(400).json({
      success: false,
      message: '无效的角色'
    });
  }

  // Validate data_scope
  const validScopes = ['all', 'department', 'self'];
  if (data_scope && !validScopes.includes(data_scope)) {
    return res.status(400).json({
      success: false,
      message: '无效的数据范围'
    });
  }

  // Update user fields
  if (role !== undefined) user.role = role;
  if (data_scope !== undefined) user.data_scope = data_scope;
  if (can_view_sensitive !== undefined) user.can_view_sensitive = can_view_sensitive;
  if (status !== undefined) user.status = status;

  await user.save();

  return res.json({
    success: true,
    message: '用户更新成功',
    data: user.toSafeObject()
  });
};

/**
 * Reset user password to default (Admin only)
 */
const resetUserPassword = async (req, res) => {
  const { id } = req.params;

  const user = await User.findByPk(id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: '用户不存在'
    });
  }

  // Hash the default password
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  user.password_hash = passwordHash;
  user.must_change_password = true;
  user.login_attempts = 0;
  user.locked_until = null;
  if (user.status === 'locked') {
    user.status = 'active';
  }

  await user.save();

  return res.json({
    success: true,
    message: `密码已重置为：${DEFAULT_PASSWORD}`
  });
};

/**
 * Delete user (Admin only)
 */
const deleteUser = async (req, res) => {
  const { id } = req.params;

  const user = await User.findByPk(id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: '用户不存在'
    });
  }

  // Prevent deleting own account
  if (user.user_id === req.user.user_id) {
    return res.status(403).json({
      success: false,
      message: '不能删除自己的账户'
    });
  }

  await user.destroy();

  return res.json({
    success: true,
    message: '用户删除成功'
  });
};

module.exports = {
  getUserProfile,
  updateUserProfile,
  changePassword,
  getUserPreferences,
  updateUserPreferences,
  getProfileEmployee,
  getUsers,
  getUserById,
  updateUserRole,
  resetUserPassword,
  deleteUser
};
