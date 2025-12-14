/**
 * Database Reset Script
 * Drops all tables and recreates them from models
 *
 * WARNING: This script will DELETE ALL DATA in the database!
 * Only use in development environment.
 */

require('dotenv').config();
const { sequelize } = require('../config/database');

async function resetDatabase() {
  try {
    console.log('========================================');
    console.log('开始数据库重置操作...');
    console.log('警告：此操作将删除所有现有数据！');
    console.log('========================================\n');

    // Check environment
    if (process.env.NODE_ENV === 'production') {
      console.error('错误：不能在生产环境执行数据库重置操作！');
      process.exit(1);
    }

    console.log('连接数据库...');
    await sequelize.authenticate();
    console.log('数据库连接成功\n');

    console.log('禁用外键检查...');
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');

    console.log('删除所有现有表并重新创建...');
    // force: true will drop all tables before recreating them
    await sequelize.sync({ force: true });

    console.log('重新启用外键检查...');
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');

    console.log('\n========================================');
    console.log('数据库重置完成！');
    console.log('========================================');
    console.log('已创建的表：');
    console.log('  - departments (部门表)');
    console.log('  - employees (员工表)');
    console.log('  - users (用户表)');
    console.log('  - onboarding_processes (入职流程表)');
    console.log('========================================\n');

    process.exit(0);
  } catch (error) {
    console.error('数据库重置失败:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run reset if called directly
if (require.main === module) {
  resetDatabase();
}

module.exports = resetDatabase;
