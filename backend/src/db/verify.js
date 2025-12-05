require('dotenv').config();
const { sequelize } = require('../config/database');

async function verify() {
  try {
    const [tables] = await sequelize.query('SHOW TABLES');
    console.log('数据库中的表:');
    tables.forEach((t) => console.log('  -', t[`Tables_in_${sequelize.config.database}`]));

    const [depts] = await sequelize.query('SELECT COUNT(*) as count FROM departments');
    console.log(`\n部门数量: ${depts[0].count}`);

    const [emps] = await sequelize.query('SELECT COUNT(*) as count FROM employees');
    console.log(`员工数量: ${emps[0].count}`);

    const [users] = await sequelize.query('SELECT COUNT(*) as count FROM users');
    console.log(`用户数量: ${users[0].count}`);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

verify();
