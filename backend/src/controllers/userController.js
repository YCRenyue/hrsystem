/**
 * User Controller - (7¡
 */

const { User, Employee, Department } = require('../models');
const bcrypt = require('bcryptjs');
const permissionService = require('../services/PermissionService');

/**
 * Get current user profile
 */
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.user_id, {
      attributes: ['user_id', 'username', 'email', 'role', 'employee_id', 'department_id', 'can_view_sensitive', 'data_scope', 'created_at'],
      include: [
        {
          model: Employee,
          as: 'employee',
          attributes: ['employee_id', 'employee_number', 'name_encrypted', 'phone_encrypted', 'email', 'department_id'],
          include: [
            {
              model: Department,
              as: 'department',
              attributes: ['department_id', 'name']
            }
          ],
          required: false
        }
      ]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Process sensitive data
    const userData = user.toJSON();
    const canViewSensitive = permissionService.canViewSensitiveData(req.user);

    if (userData.employee) {
      userData.employee = permissionService.processSensitiveFields(
        userData.employee,
        canViewSensitive,
        'mask'
      );
    }

    res.json({
      success: true,
      data: userData
    });
  } catch (error) {
    console.error('Error getting user profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user profile'
    });
  }
};

/**
 * Update user profile
 */
const updateUserProfile = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findByPk(req.user.user_id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Only allow updating email
    if (email) {
      user.email = email;
      await user.save();
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: user
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
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
    const { fontSize, backgroundColor, primaryColor, theme, language } = req.body;

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

module.exports = {
  getUserProfile,
  updateUserProfile,
  changePassword,
  getUserPreferences,
  updateUserPreferences
};
