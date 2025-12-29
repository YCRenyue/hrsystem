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
      message: 'User not found'
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

  res.json({
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
    email, emergency_contact, emergency_phone, address, status: _status, role: _role
  } = req.body;

  // Check for restricted fields
  const restrictedFields = ['status', 'role', 'employee_number', 'department_id'];
  const attemptedFields = Object.keys(req.body);
  const hasRestrictedField = attemptedFields.some((field) => restrictedFields.includes(field));

  if (hasRestrictedField) {
    return res.status(403).json({
      success: false,
      message: 'Cannot update restricted fields'
    });
  }

  // Validate email format if provided
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid email format'
    });
  }

  const user = await User.findByPk(req.user.user_id);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Update allowed user fields
  if (email !== undefined) user.email = email;
  await user.save();

  // Update employee fields if exists
  if (user.employee_id) {
    const employee = await Employee.findByPk(user.employee_id);
    if (employee) {
      if (email !== undefined) employee.email = email;
      if (emergency_contact !== undefined) employee.emergency_contact = emergency_contact;
      if (emergency_phone !== undefined) employee.emergency_phone = emergency_phone;
      if (address !== undefined) employee.address = address;
      await employee.save();

      return res.json({
        success: true,
        message: 'Profile updated successfully',
        data: employee.toSafeObject(false)
      });
    }
  }

  res.json({
    success: true,
    message: 'Profile updated successfully',
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
        message: 'Current password and new password are required'
      });
    }

    const user = await User.findByPk(req.user.user_id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    user.password_hash = newPasswordHash;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password'
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
        message: 'User not found'
      });
    }

    // Return preferences or default values
    const preferences = user.preferences || {
      fontSize: 'medium',
      backgroundColor: '#ffffff',
      primaryColor: '#1890ff'
    };

    res.json({
      success: true,
      data: preferences
    });
  } catch (error) {
    console.error('Error getting user preferences:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get preferences'
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
        message: 'User not found'
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

    res.json({
      success: true,
      message: 'Preferences updated successfully',
      data: preferences
    });
  } catch (error) {
    console.error('Error updating user preferences:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update preferences'
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
      message: 'Employee information not found'
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
      message: 'Employee not found'
    });
  }

  // Return employee with full information but masked sensitive data
  const employeeData = employee.toSafeObject(false);

  res.json({
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
      message: 'User not found'
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

  res.json({
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
      message: 'User not found'
    });
  }

  // Prevent modifying admin's own role
  if (user.user_id === req.user.user_id && role && role !== user.role) {
    return res.status(403).json({
      success: false,
      message: 'Cannot modify your own role'
    });
  }

  // Validate role
  const validRoles = ['admin', 'hr_admin', 'department_manager', 'employee'];
  if (role && !validRoles.includes(role)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid role'
    });
  }

  // Validate data_scope
  const validScopes = ['all', 'department', 'self'];
  if (data_scope && !validScopes.includes(data_scope)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid data scope'
    });
  }

  // Update user fields
  if (role !== undefined) user.role = role;
  if (data_scope !== undefined) user.data_scope = data_scope;
  if (can_view_sensitive !== undefined) user.can_view_sensitive = can_view_sensitive;
  if (status !== undefined) user.status = status;

  await user.save();

  res.json({
    success: true,
    message: 'User updated successfully',
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
      message: 'User not found'
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

  res.json({
    success: true,
    message: `Password reset to default: ${DEFAULT_PASSWORD}`
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
      message: 'User not found'
    });
  }

  // Prevent deleting own account
  if (user.user_id === req.user.user_id) {
    return res.status(403).json({
      success: false,
      message: 'Cannot delete your own account'
    });
  }

  await user.destroy();

  res.json({
    success: true,
    message: 'User deleted successfully'
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
