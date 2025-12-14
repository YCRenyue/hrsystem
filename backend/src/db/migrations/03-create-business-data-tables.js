/**
 * Migration: Create Business Data Tables
 * Creates tables for annual leave, social security, business trips, and canteen meals
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create annual_leave table
    await queryInterface.createTable('annual_leave', {
      leave_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        comment: '年假记录ID'
      },
      employee_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'employees',
          key: 'employee_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: '员工ID'
      },
      year: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: '年度'
      },
      total_days: {
        type: Sequelize.DECIMAL(5, 1),
        allowNull: false,
        defaultValue: 0,
        comment: '应休天数'
      },
      used_days: {
        type: Sequelize.DECIMAL(5, 1),
        allowNull: false,
        defaultValue: 0,
        comment: '已休天数'
      },
      remaining_days: {
        type: Sequelize.DECIMAL(5, 1),
        allowNull: false,
        defaultValue: 0,
        comment: '剩余天数'
      },
      carry_over_days: {
        type: Sequelize.DECIMAL(5, 1),
        defaultValue: 0,
        comment: '上年结转天数'
      },
      expiry_date: {
        type: Sequelize.DATEONLY,
        comment: '过期日期'
      },
      notes: {
        type: Sequelize.TEXT,
        comment: '备注'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    }, {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
      comment: '年假管理表'
    });

    // Add indexes for annual_leave
    await queryInterface.addIndex('annual_leave', ['employee_id', 'year'], {
      unique: true,
      name: 'idx_annual_leave_employee_year'
    });

    // Create social_security table
    await queryInterface.createTable('social_security', {
      security_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        comment: '社保记录ID'
      },
      employee_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'employees',
          key: 'employee_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: '员工ID'
      },
      year_month: {
        type: Sequelize.STRING(7),
        allowNull: false,
        comment: '年月 (YYYY-MM)'
      },
      social_security_base: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        comment: '社保基数'
      },
      housing_fund_base: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        comment: '公积金基数'
      },
      pension_personal: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0,
        comment: '养老保险-个人'
      },
      pension_company: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0,
        comment: '养老保险-公司'
      },
      medical_personal: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0,
        comment: '医疗保险-个人'
      },
      medical_company: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0,
        comment: '医疗保险-公司'
      },
      unemployment_personal: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0,
        comment: '失业保险-个人'
      },
      unemployment_company: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0,
        comment: '失业保险-公司'
      },
      injury_company: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0,
        comment: '工伤保险-公司'
      },
      maternity_company: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0,
        comment: '生育保险-公司'
      },
      housing_fund_personal: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0,
        comment: '公积金-个人'
      },
      housing_fund_company: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0,
        comment: '公积金-公司'
      },
      total_personal: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0,
        comment: '个人合计'
      },
      total_company: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0,
        comment: '公司合计'
      },
      payment_status: {
        type: Sequelize.ENUM('pending', 'paid', 'failed'),
        defaultValue: 'pending',
        comment: '缴纳状态'
      },
      payment_date: {
        type: Sequelize.DATEONLY,
        comment: '缴纳日期'
      },
      notes: {
        type: Sequelize.TEXT,
        comment: '备注'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    }, {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
      comment: '社保公积金管理表'
    });

    // Add indexes for social_security
    await queryInterface.addIndex('social_security', ['employee_id', 'year_month'], {
      unique: true,
      name: 'idx_social_security_employee_month'
    });

    // Create business_trip_allowance table
    await queryInterface.createTable('business_trip_allowance', {
      trip_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        comment: '出差补助ID'
      },
      employee_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'employees',
          key: 'employee_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: '员工ID'
      },
      trip_number: {
        type: Sequelize.STRING(50),
        unique: true,
        comment: '出差单号'
      },
      start_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        comment: '出差开始日期'
      },
      end_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        comment: '出差结束日期'
      },
      destination: {
        type: Sequelize.STRING(200),
        allowNull: false,
        comment: '出差目的地'
      },
      purpose: {
        type: Sequelize.TEXT,
        comment: '出差目的'
      },
      days: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
        comment: '出差天数'
      },
      transportation_allowance: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0,
        comment: '交通补助'
      },
      accommodation_allowance: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0,
        comment: '住宿补助'
      },
      meal_allowance: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0,
        comment: '餐费补助'
      },
      other_allowance: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0,
        comment: '其他补助'
      },
      total_allowance: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0,
        comment: '补助合计'
      },
      status: {
        type: Sequelize.ENUM('draft', 'pending', 'approved', 'rejected', 'paid'),
        defaultValue: 'draft',
        comment: '申请状态'
      },
      approver_id: {
        type: Sequelize.UUID,
        references: {
          model: 'users',
          key: 'user_id'
        },
        comment: '审批人ID'
      },
      approval_date: {
        type: Sequelize.DATE,
        comment: '审批时间'
      },
      approval_notes: {
        type: Sequelize.TEXT,
        comment: '审批意见'
      },
      attachments: {
        type: Sequelize.TEXT,
        comment: '附件路径（JSON数组）'
      },
      notes: {
        type: Sequelize.TEXT,
        comment: '备注'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    }, {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
      comment: '出差补助管理表'
    });

    // Add indexes for business_trip_allowance
    await queryInterface.addIndex('business_trip_allowance', ['employee_id']);
    await queryInterface.addIndex('business_trip_allowance', ['start_date', 'end_date']);
    await queryInterface.addIndex('business_trip_allowance', ['status']);

    // Create canteen_meal table
    await queryInterface.createTable('canteen_meal', {
      meal_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        comment: '就餐记录ID'
      },
      employee_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'employees',
          key: 'employee_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: '员工ID'
      },
      meal_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        comment: '就餐日期'
      },
      meal_type: {
        type: Sequelize.ENUM('breakfast', 'lunch', 'dinner'),
        allowNull: false,
        comment: '餐次'
      },
      location: {
        type: Sequelize.STRING(100),
        comment: '就餐地点'
      },
      location_type: {
        type: Sequelize.ENUM('canteen', 'external'),
        defaultValue: 'canteen',
        comment: '地点类型'
      },
      amount: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0,
        comment: '餐费金额'
      },
      subsidy_amount: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0,
        comment: '补贴金额'
      },
      payment_method: {
        type: Sequelize.ENUM('cash', 'card', 'mobile_pay', 'subsidy'),
        comment: '支付方式'
      },
      is_subsidized: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        comment: '是否享受补贴'
      },
      notes: {
        type: Sequelize.TEXT,
        comment: '备注'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    }, {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
      comment: '就餐记录管理表'
    });

    // Add indexes for canteen_meal
    await queryInterface.addIndex('canteen_meal', ['employee_id', 'meal_date', 'meal_type'], {
      unique: true,
      name: 'idx_canteen_meal_employee_date_type'
    });
    await queryInterface.addIndex('canteen_meal', ['meal_date']);
  },

  down: async (queryInterface, _Sequelize) => {
    // Drop tables in reverse order
    await queryInterface.dropTable('canteen_meal');
    await queryInterface.dropTable('business_trip_allowance');
    await queryInterface.dropTable('social_security');
    await queryInterface.dropTable('annual_leave');
  }
};
