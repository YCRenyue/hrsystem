/**
 * User Controller - (7�
 */

const bcrypt = require('bcryptjs');
const { User, Employee, Department } = require('../models');
const _permissionService = require('../services/PermissionService');

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

module.exports = {
  getUserProfile,
  updateUserProfile,
  changePassword,
  getUserPreferences,
  updateUserPreferences,
  getProfileEmployee
};
