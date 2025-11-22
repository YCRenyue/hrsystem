/**
 * Migration: Create Initial Tables
 * Creates departments, employees, users, and onboarding_processes tables
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create departments table
    await queryInterface.createTable('departments', {
      department_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        comment: '部门ID'
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: '部门名称'
      },
      code: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true,
        comment: '部门编码'
      },
      parent_id: {
        type: Sequelize.UUID,
        allowNull: true,
        comment: '上级部门ID',
        references: {
          model: 'departments',
          key: 'department_id'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      },
      level: {
        type: Sequelize.INTEGER,
        defaultValue: 1,
        comment: '部门层级'
      },
      path: {
        type: Sequelize.STRING(500),
        allowNull: true,
        comment: '部门路径'
      },
      manager_id: {
        type: Sequelize.UUID,
        allowNull: true,
        comment: '部门负责人ID'
      },
      dingtalk_dept_id: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: '钉钉部门ID'
      },
      status: {
        type: Sequelize.STRING(20),
        defaultValue: 'active',
        comment: '状态'
      },
      sort_order: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: '排序顺序'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: '部门描述'
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        comment: '创建时间'
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        comment: '更新时间'
      },
      created_by: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: '创建人'
      }
    }, {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
      comment: '部门信息表'
    });

    // Add indexes for departments
    await queryInterface.addIndex('departments', ['parent_id'], {
      name: 'idx_parent_id'
    });
    await queryInterface.addIndex('departments', ['code'], {
      name: 'idx_code'
    });
    await queryInterface.addIndex('departments', ['status'], {
      name: 'idx_status'
    });
    await queryInterface.addIndex('departments', ['dingtalk_dept_id'], {
      name: 'idx_dingtalk_dept'
    });

    // Create employees table
    await queryInterface.createTable('employees', {
      employee_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        comment: '员工ID'
      },
      employee_number: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true,
        comment: '工号'
      },
      email: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: '邮箱'
      },
      name_encrypted: {
        type: Sequelize.BLOB,
        allowNull: true,
        comment: '姓名(加密)'
      },
      phone_encrypted: {
        type: Sequelize.BLOB,
        allowNull: true,
        comment: '手机号(加密)'
      },
      id_card_encrypted: {
        type: Sequelize.BLOB,
        allowNull: true,
        comment: '身份证号(加密)'
      },
      bank_card_encrypted: {
        type: Sequelize.BLOB,
        allowNull: true,
        comment: '银行卡号(加密)'
      },
      birth_date_encrypted: {
        type: Sequelize.BLOB,
        allowNull: true,
        comment: '出生日期(加密)'
      },
      department_id: {
        type: Sequelize.UUID,
        allowNull: true,
        comment: '部门ID',
        references: {
          model: 'departments',
          key: 'department_id'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      },
      position: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: '职位'
      },
      employment_type: {
        type: Sequelize.STRING(20),
        defaultValue: 'full_time',
        comment: '用工类型'
      },
      entry_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
        comment: '入职日期'
      },
      probation_end_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
        comment: '试用期结束日期'
      },
      leave_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
        comment: '离职日期'
      },
      status: {
        type: Sequelize.STRING(20),
        defaultValue: 'pending',
        comment: '状态'
      },
      dingtalk_user_id: {
        type: Sequelize.STRING(100),
        allowNull: true,
        unique: true,
        comment: '钉钉用户ID'
      },
      id_card_front_s3_path: {
        type: Sequelize.STRING(500),
        allowNull: true,
        comment: '身份证正面S3路径'
      },
      id_card_back_s3_path: {
        type: Sequelize.STRING(500),
        allowNull: true,
        comment: '身份证反面S3路径'
      },
      gender: {
        type: Sequelize.STRING(10),
        allowNull: true,
        comment: '性别'
      },
      address: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: '家庭住址'
      },
      emergency_contact: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: '紧急联系人'
      },
      emergency_phone: {
        type: Sequelize.STRING(20),
        allowNull: true,
        comment: '紧急联系电话'
      },
      data_complete: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        comment: '数据是否完整'
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        comment: '创建时间'
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        comment: '更新时间'
      },
      created_by: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: '创建人'
      },
      updated_by: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: '更新人'
      }
    }, {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
      comment: '员工信息表'
    });

    // Add indexes for employees
    await queryInterface.addIndex('employees', ['employee_number'], {
      name: 'idx_employee_number'
    });
    await queryInterface.addIndex('employees', ['department_id'], {
      name: 'idx_department'
    });
    await queryInterface.addIndex('employees', ['status'], {
      name: 'idx_status'
    });
    await queryInterface.addIndex('employees', ['entry_date'], {
      name: 'idx_entry_date'
    });
    await queryInterface.addIndex('employees', ['dingtalk_user_id'], {
      name: 'idx_dingtalk_user'
    });

    // Add foreign key for departments.manager_id -> employees.employee_id
    await queryInterface.addConstraint('departments', {
      fields: ['manager_id'],
      type: 'foreign key',
      name: 'fk_departments_manager',
      references: {
        table: 'employees',
        field: 'employee_id'
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });

    // Create users table
    await queryInterface.createTable('users', {
      user_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        comment: '用户ID'
      },
      employee_id: {
        type: Sequelize.UUID,
        allowNull: true,
        unique: true,
        comment: '关联员工ID',
        references: {
          model: 'employees',
          key: 'employee_id'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      },
      username: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true,
        comment: '用户名'
      },
      password_hash: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: '密码哈希'
      },
      display_name: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: '显示名称'
      },
      email: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: '邮箱'
      },
      phone: {
        type: Sequelize.STRING(20),
        allowNull: true,
        comment: '手机号'
      },
      role: {
        type: Sequelize.STRING(50),
        defaultValue: 'employee',
        comment: '角色'
      },
      permissions: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: '权限列表'
      },
      status: {
        type: Sequelize.STRING(20),
        defaultValue: 'active',
        comment: '状态'
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        comment: '是否激活'
      },
      login_attempts: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: '登录尝试次数'
      },
      last_login_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: '最后登录时间'
      },
      last_login_ip: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: '最后登录IP'
      },
      locked_until: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: '锁定到期时间'
      },
      password_changed_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: '密码最后修改时间'
      },
      password_expires_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: '密码过期时间'
      },
      must_change_password: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        comment: '必须修改密码'
      },
      refresh_token: {
        type: Sequelize.STRING(500),
        allowNull: true,
        comment: '刷新令牌'
      },
      refresh_token_expires_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: '刷新令牌过期时间'
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        comment: '创建时间'
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        comment: '更新时间'
      },
      created_by: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: '创建人'
      }
    }, {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
      comment: '用户权限表'
    });

    // Add indexes for users
    await queryInterface.addIndex('users', ['username'], {
      name: 'idx_username'
    });
    await queryInterface.addIndex('users', ['employee_id'], {
      name: 'idx_employee_id'
    });
    await queryInterface.addIndex('users', ['role'], {
      name: 'idx_role'
    });
    await queryInterface.addIndex('users', ['status'], {
      name: 'idx_status'
    });
    await queryInterface.addIndex('users', ['last_login_at'], {
      name: 'idx_last_login'
    });

    // Create onboarding_processes table
    await queryInterface.createTable('onboarding_processes', {
      process_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        comment: '流程ID'
      },
      employee_id: {
        type: Sequelize.UUID,
        allowNull: false,
        comment: '员工ID',
        references: {
          model: 'employees',
          key: 'employee_id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      status: {
        type: Sequelize.STRING(20),
        defaultValue: 'pending',
        comment: '状态'
      },
      form_token: {
        type: Sequelize.STRING(100),
        allowNull: true,
        unique: true,
        comment: '表单访问令牌'
      },
      form_link: {
        type: Sequelize.STRING(500),
        allowNull: true,
        comment: '表单访问链接'
      },
      token_expires_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: '令牌过期时间'
      },
      push_channel: {
        type: Sequelize.STRING(20),
        allowNull: true,
        comment: '推送渠道'
      },
      push_time: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: '推送时间'
      },
      push_status: {
        type: Sequelize.STRING(20),
        allowNull: true,
        comment: '推送状态'
      },
      push_error: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: '推送错误信息'
      },
      completed_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: '完成时间'
      },
      submitted_data: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: '提交的数据'
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        comment: '创建时间'
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        comment: '更新时间'
      },
      created_by: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: '创建人'
      }
    }, {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
      comment: '入职流程表'
    });

    // Add indexes for onboarding_processes
    await queryInterface.addIndex('onboarding_processes', ['employee_id'], {
      name: 'idx_employee_id'
    });
    await queryInterface.addIndex('onboarding_processes', ['status'], {
      name: 'idx_status'
    });
    await queryInterface.addIndex('onboarding_processes', ['form_token'], {
      name: 'idx_form_token'
    });
    await queryInterface.addIndex('onboarding_processes', ['created_at'], {
      name: 'idx_created_at'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Drop tables in reverse order
    await queryInterface.dropTable('onboarding_processes');
    await queryInterface.dropTable('users');

    // Remove foreign key from departments before dropping employees
    await queryInterface.removeConstraint('departments', 'fk_departments_manager');

    await queryInterface.dropTable('employees');
    await queryInterface.dropTable('departments');
  }
};
