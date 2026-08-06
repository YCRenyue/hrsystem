/**
 * Migration: Create operation_logs table (敏感操作审计日志)
 *
 * 记录对员工 PII、用户权限等敏感数据的 create/update/delete/export/role_change 等
 * 操作，用于合规审计。old_values/new_values 仅存元信息，不含敏感明文。
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('operation_logs', {
      log_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        comment: '日志ID'
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'user_id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: '操作人用户ID（系统操作时为空）'
      },
      operation_type: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: '操作类型 create/update/delete/export/role_change/password_reset'
      },
      table_name: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: '目标数据表'
      },
      record_id: {
        type: Sequelize.STRING(64),
        allowNull: true,
        comment: '目标记录ID'
      },
      old_values: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: '变更前元信息（不含敏感明文）'
      },
      new_values: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: '变更后元信息（不含敏感明文）'
      },
      ip_address: {
        type: Sequelize.STRING(64),
        allowNull: true,
        comment: '操作来源IP'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    }, {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci'
    });

    await queryInterface.addIndex('operation_logs', ['user_id'], {
      name: 'idx_operation_logs_user'
    });
    await queryInterface.addIndex('operation_logs', ['table_name'], {
      name: 'idx_operation_logs_table'
    });
    await queryInterface.addIndex('operation_logs', ['operation_type'], {
      name: 'idx_operation_logs_type'
    });
    await queryInterface.addIndex('operation_logs', ['created_at'], {
      name: 'idx_operation_logs_created'
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('operation_logs');
  }
};
