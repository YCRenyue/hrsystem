/**
 * Database Migration Script
 * Runs all pending migrations
 */

require('dotenv').config();
const { sequelize } = require('../config/database');
const fs = require('fs');
const path = require('path');

async function runMigrations() {
  try {
    console.log('========================================');
    console.log('开始数据库迁移...');
    console.log('========================================\n');

    // Check environment
    if (process.env.NODE_ENV === 'production') {
      console.warn('警告：正在生产环境执行数据库迁移！');
      console.warn('请确保已经备份数据库！\n');
    }

    console.log('连接数据库...');
    await sequelize.authenticate();
    console.log('数据库连接成功\n');

    // Get migration files
    const migrationsDir = path.join(__dirname, 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.js'))
      .sort();

    console.log(`找到 ${migrationFiles.length} 个迁移文件\n`);

    // Run each migration
    for (const file of migrationFiles) {
      console.log(`执行迁移: ${file}`);
      const migration = require(path.join(migrationsDir, file));

      await migration.up(sequelize.getQueryInterface(), sequelize.Sequelize);
      console.log(`✓ ${file} 执行成功\n`);
    }

    console.log('========================================');
    console.log('数据库迁移完成！');
    console.log('========================================\n');

    process.exit(0);
  } catch (error) {
    console.error('数据库迁移失败:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run migrations if called directly
if (require.main === module) {
  runMigrations();
}

module.exports = runMigrations;
