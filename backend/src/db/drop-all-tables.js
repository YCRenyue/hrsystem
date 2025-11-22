/**
 * Drop All Tables Script
 * Removes all tables from the database
 *
 * WARNING: This script will DELETE ALL TABLES!
 * Only use in development environment.
 */

require('dotenv').config();
const { sequelize } = require('../config/database');

async function dropAllTables() {
  try {
    console.log('========================================');
    console.log('开始删除所有表...');
    console.log('警告：此操作将删除所有表！');
    console.log('========================================\n');

    // Check environment
    if (process.env.NODE_ENV === 'production') {
      console.error('错误：不能在生产环境执行此操作！');
      process.exit(1);
    }

    console.log('连接数据库...');
    await sequelize.authenticate();
    console.log('数据库连接成功\n');

    console.log('禁用外键检查...');
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');

    console.log('获取所有表...');
    const [tables] = await sequelize.query('SHOW TABLES');

    console.log(`找到 ${tables.length} 个表\n`);

    for (const table of tables) {
      const tableName = table[`Tables_in_${sequelize.config.database}`];
      console.log(`删除表: ${tableName}`);
      await sequelize.query(`DROP TABLE IF EXISTS \`${tableName}\``);
    }

    console.log('\n重新启用外键检查...');
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');

    console.log('\n========================================');
    console.log('所有表已删除完成！');
    console.log('========================================\n');

    process.exit(0);
  } catch (error) {
    console.error('删除表失败:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  dropAllTables();
}

module.exports = dropAllTables;
