/**
 * Migration: Add RBAC (Role-Based Access Control) Fields
 *
 * Purpose: 添加基于角色和数据范围的权限控制字段到 users 表
 *
 * Changes:
 * - 添加 department_id 字段：部门经理所属部门
 * - 添加 data_scope 字段：数据访问范围(all/department/self)
 * - 添加 can_view_sensitive 字段：是否可查看敏感数据
 * - 更新 role 字段验证：支持新角色 hr_admin, department_manager
 * - 添加索引：提升权限查询性能
 */

module.exports = {
  /**
   * 应用迁移
   */
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      console.log('开始执行 RBAC 字段迁移...');

      // 1. 添加 department_id 字段
      await queryInterface.addColumn(
        'users',
        'department_id',
        {
          type: Sequelize.UUID,
          allowNull: true,
          comment: '所属部门ID（用于部门经理）',
          references: {
            model: 'departments',
            key: 'department_id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        { transaction }
      );
      console.log('✓ 已添加 department_id 字段');

      // 2. 添加 data_scope 字段
      await queryInterface.addColumn(
        'users',
        'data_scope',
        {
          type: Sequelize.ENUM('all', 'department', 'self'),
          defaultValue: 'self',
          allowNull: false,
          comment: '数据访问范围：all-全部，department-本部门，self-仅自己'
        },
        { transaction }
      );
      console.log('✓ 已添加 data_scope 字段');

      // 3. 添加 can_view_sensitive 字段
      await queryInterface.addColumn(
        'users',
        'can_view_sensitive',
        {
          type: Sequelize.BOOLEAN,
          defaultValue: false,
          allowNull: false,
          comment: '是否可查看敏感数据（完整身份证、电话等）'
        },
        { transaction }
      );
      console.log('✓ 已添加 can_view_sensitive 字段');

      // 4. 添加索引以提升查询性能
      await queryInterface.addIndex(
        'users',
        ['department_id'],
        {
          name: 'idx_users_department',
          transaction
        }
      );
      console.log('✓ 已添加 department_id 索引');

      await queryInterface.addIndex(
        'users',
        ['role', 'data_scope'],
        {
          name: 'idx_users_role_scope',
          transaction
        }
      );
      console.log('✓ 已添加复合索引 role + data_scope');

      // 5. 更新现有 admin 用户的权限字段
      await queryInterface.sequelize.query(
        `UPDATE users
         SET data_scope = 'all',
             can_view_sensitive = true
         WHERE role = 'admin'`,
        { transaction }
      );
      console.log('✓ 已更新 admin 用户权限配置');

      // 6. 更新现有 hr 用户的权限字段 (改为 hr_admin)
      await queryInterface.sequelize.query(
        `UPDATE users
         SET role = 'hr_admin',
             data_scope = 'all',
             can_view_sensitive = true
         WHERE role = 'hr'`,
        { transaction }
      );
      console.log('✓ 已将 hr 角色迁移为 hr_admin 并更新权限');

      await transaction.commit();
      console.log('✅ RBAC 字段迁移完成！');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ RBAC 字段迁移失败:', error);
      throw error;
    }
  },

  /**
   * 回滚迁移
   */
  async down(queryInterface, _Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      console.log('开始回滚 RBAC 字段迁移...');

      // 回滚 hr_admin 到 hr
      await queryInterface.sequelize.query(
        'UPDATE users SET role = \'hr\' WHERE role = \'hr_admin\'',
        { transaction }
      );

      // 删除索引
      await queryInterface.removeIndex('users', 'idx_users_role_scope', { transaction });
      await queryInterface.removeIndex('users', 'idx_users_department', { transaction });
      console.log('✓ 已删除索引');

      // 删除字段
      await queryInterface.removeColumn('users', 'can_view_sensitive', { transaction });
      await queryInterface.removeColumn('users', 'data_scope', { transaction });
      await queryInterface.removeColumn('users', 'department_id', { transaction });
      console.log('✓ 已删除 RBAC 相关字段');

      await transaction.commit();
      console.log('✅ RBAC 字段迁移回滚完成！');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ 回滚失败:', error);
      throw error;
    }
  }
};
