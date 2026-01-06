const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');
const { encryptionService } = require('../utils/encryption');

/**
 * User Model
 * Manages system user accounts and authentication
 */
class User extends Model {
  /**
   * Verify password against stored hash
   * @param {string} password - Plain text password to verify
   * @returns {Promise<boolean>} True if password matches
   */
  async verifyPassword(password) {
    return await encryptionService.verifyPassword(password, this.password_hash);
  }

  /**
   * Update password with new hash
   * @param {string} newPassword - Plain text new password
   */
  async updatePassword(newPassword) {
    this.password_hash = await encryptionService.hashPassword(newPassword);
    this.password_changed_at = new Date();
    this.must_change_password = false;

    // Set password expiration (90 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 90);
    this.password_expires_at = expiresAt;

    await this.save();
  }

  /**
   * Check if password is expired
   * @returns {boolean} True if password has expired
   */
  isPasswordExpired() {
    if (!this.password_expires_at) return false;
    return new Date() > new Date(this.password_expires_at);
  }

  /**
   * Check if account is locked
   * @returns {boolean} True if account is locked
   */
  isLocked() {
    if (this.status === 'locked') {
      if (this.locked_until && new Date() > new Date(this.locked_until)) {
        // Lock period has expired, unlock account
        this.status = 'active';
        this.login_attempts = 0;
        this.locked_until = null;
        this.save();
        return false;
      }
      return true;
    }
    return false;
  }

  /**
   * Record failed login attempt
   * Locks account after 5 failed attempts
   */
  async recordFailedLogin() {
    this.login_attempts += 1;

    if (this.login_attempts >= 5) {
      this.status = 'locked';
      // Lock for 30 minutes
      const lockedUntil = new Date();
      lockedUntil.setMinutes(lockedUntil.getMinutes() + 30);
      this.locked_until = lockedUntil;
    }

    await this.save();
  }

  /**
   * Record successful login
   * @param {string} ipAddress - IP address of login
   */
  async recordSuccessfulLogin(ipAddress) {
    this.last_login_at = new Date();
    this.last_login_ip = ipAddress;
    this.login_attempts = 0;
    this.locked_until = null;
    await this.save();
  }

  /**
   * Check if user has specific permission
   * @param {string} permission - Permission to check
   * @returns {boolean} True if user has permission
   */
  hasPermission(permission) {
    // Admin has all permissions
    if (this.role === 'admin') return true;

    if (!this.permissions) return false;

    // Check if permission exists in permissions array
    return this.permissions.includes(permission);
  }

  /**
   * Check if user has specific role
   * @param {string} role - Role to check
   * @returns {boolean} True if user has role
   */
  hasRole(role) {
    return this.role === role;
  }

  /**
   * Check if user can access specific department
   * @param {string} departmentId - Department ID to check
   * @returns {boolean} True if user can access department
   */
  canAccessDepartment(departmentId) {
    // Admin and HR can access all departments
    if (this.data_scope === 'all') {
      return true;
    }

    // Department managers can only access their own department
    if (this.data_scope === 'department') {
      return this.department_id === departmentId;
    }

    // Regular employees can't access department-level data
    return false;
  }

  /**
   * Get data scope filter for queries
   * @param {string} resourceType - Type of resource (e.g., 'employee', 'department')
   * @returns {Object|null} Sequelize where clause for data filtering
   */
  getDataScopeFilter(resourceType = 'employee') {
    if (this.data_scope === 'all') {
      return {}; // No filter, can see all
    }

    if (this.data_scope === 'department') {
      // Filter by department
      return { department_id: this.department_id };
    }

    if (this.data_scope === 'self') {
      // Filter by employee_id
      if (resourceType === 'employee') {
        return { employee_id: this.employee_id };
      }
      // For other resources, return employee_id filter
      return { employee_id: this.employee_id };
    }

    return null;
  }

  /**
   * Check if user can view sensitive data for a specific employee
   * @param {string} targetEmployeeId - Employee ID to check
   * @returns {boolean} True if user can view sensitive data
   */
  canViewSensitiveData(targetEmployeeId) {
    // Must have can_view_sensitive flag
    if (!this.can_view_sensitive) {
      return false;
    }

    // Admin and HR can view all sensitive data
    if (this.data_scope === 'all') {
      return true;
    }

    // Department managers can view sensitive data for their department employees
    // (This requires department check at query level)
    if (this.data_scope === 'department') {
      // Will be validated at query level with department check
      return true;
    }

    // Employees can only view their own sensitive data
    if (this.data_scope === 'self') {
      return this.employee_id === targetEmployeeId;
    }

    return false;
  }

  /**
   * Check if user can edit specific employee fields
   * @param {string} targetEmployeeId - Employee ID to check
   * @param {Array<string>} fields - Fields to edit
   * @returns {Object} { canEdit: boolean, editableFields: Array<string> }
   */
  canEditEmployeeFields(targetEmployeeId, fields = []) {
    // Admin and HR can edit all fields for all employees
    if (this.role === 'admin' || this.role === 'hr_admin') {
      return { canEdit: true, editableFields: fields };
    }

    // Department managers can edit limited fields for their department
    if (this.role === 'department_manager') {
      const allowedFields = ['phone', 'email', 'position', 'emergency_contact'];
      const editableFields = fields.filter((f) => allowedFields.includes(f));
      return { canEdit: editableFields.length > 0, editableFields };
    }

    // Employees can only edit their own limited fields
    if (this.role === 'employee' && this.employee_id === targetEmployeeId) {
      const allowedFields = ['phone', 'email', 'emergency_contact', 'address'];
      const editableFields = fields.filter((f) => allowedFields.includes(f));
      return { canEdit: editableFields.length > 0, editableFields };
    }

    return { canEdit: false, editableFields: [] };
  }

  /**
   * Generate safe user object for API response (without sensitive data)
   * @returns {Object} Safe user data
   */
  toSafeObject() {
    return {
      user_id: this.user_id,
      employee_id: this.employee_id,
      username: this.username,
      display_name: this.display_name,
      email: this.email,
      phone: this.phone,
      role: this.role,
      permissions: this.permissions,
      department_id: this.department_id,
      data_scope: this.data_scope,
      can_view_sensitive: this.can_view_sensitive,
      status: this.status,
      is_active: this.is_active,
      last_login_at: this.last_login_at,
      must_change_password: this.must_change_password,
      password_expires_at: this.password_expires_at,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}

User.init(
  {
    user_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: '用户ID'
    },
    employee_id: {
      type: DataTypes.UUID,
      allowNull: true,
      unique: true,
      comment: '关联员工ID',
      references: {
        model: 'employees',
        key: 'employee_id'
      }
    },
    username: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      comment: '用户名',
      validate: {
        notEmpty: {
          msg: '用户名不能为空'
        },
        len: {
          args: [3, 50],
          msg: '用户名长度必须在3到50个字符之间'
        },
        is: {
          args: /^[a-zA-Z0-9_]+$/,
          msg: '用户名只能包含字母、数字和下划线'
        }
      }
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: '密码哈希'
    },
    display_name: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: '显示名称'
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: '邮箱',
      validate: {
        isEmail: {
          msg: '邮箱格式不正确'
        }
      }
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: '手机号'
    },
    role: {
      type: DataTypes.STRING(50),
      defaultValue: 'employee',
      comment: '角色',
      validate: {
        isIn: {
          args: [['admin', 'hr_admin', 'department_manager', 'employee']],
          msg: '无效的角色，必须是以下之一：admin, hr_admin, department_manager, employee'
        }
      }
    },
    department_id: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: '所属部门ID（用于部门经理）',
      references: {
        model: 'departments',
        key: 'department_id'
      }
    },
    data_scope: {
      type: DataTypes.ENUM('all', 'department', 'self'),
      defaultValue: 'self',
      allowNull: false,
      comment: '数据访问范围：all-全部，department-本部门，self-仅自己'
    },
    can_view_sensitive: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      comment: '是否可查看敏感数据'
    },
    permissions: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: '权限列表'
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'active',
      comment: '状态',
      validate: {
        isIn: {
          args: [['active', 'inactive', 'locked']],
          msg: '无效的状态'
        }
      }
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: '是否激活'
    },
    login_attempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '登录尝试次数'
    },
    last_login_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '最后登录时间'
    },
    last_login_ip: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: '最后登录IP'
    },
    locked_until: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '锁定到期时间'
    },
    password_changed_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '密码最后修改时间'
    },
    password_expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '密码过期时间'
    },
    must_change_password: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: '必须修改密码'
    },
    refresh_token: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: '刷新令牌'
    },
    refresh_token_expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '刷新令牌过期时间'
    },
    preferences: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: '用户偏好设置（主题、字体、颜色等）'
    },
    created_by: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: '创建人'
    }
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    comment: '用户权限表',
    indexes: [
      {
        name: 'idx_username',
        fields: ['username']
      },
      {
        name: 'idx_employee_id',
        fields: ['employee_id']
      },
      {
        name: 'idx_role',
        fields: ['role']
      },
      {
        name: 'idx_status',
        fields: ['status']
      },
      {
        name: 'idx_last_login',
        fields: ['last_login_at']
      },
      {
        name: 'idx_users_department',
        fields: ['department_id']
      },
      {
        name: 'idx_users_role_scope',
        fields: ['role', 'data_scope']
      }
    ],
    defaultScope: {
      attributes: { exclude: ['password_hash', 'refresh_token'] }
    },
    scopes: {
      withPassword: {
        attributes: { include: ['password_hash'] }
      }
    }
  }
);

module.exports = User;
