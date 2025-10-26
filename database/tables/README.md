# HR系统数据库表结构

本目录包含HR系统所有数据表的SQL创建脚本。

## 📋 表结构清单

| 序号 | 文件名 | 表名 | 说明 |
|------|--------|------|------|
| 01 | `01_employees.sql` | employees | 员工信息表（核心表，包含加密字段） |
| 02 | `02_departments.sql` | departments | 部门信息表 |
| 03 | `03_onboarding_processes.sql` | onboarding_processes | 入职流程表 |
| 04 | `04_attendance_records.sql` | attendance_records | 考勤记录表 |
| 05 | `05_annual_leaves.sql` | annual_leaves | 年假管理表 |
| 06 | `06_social_security.sql` | social_security | 社保公积金表 |
| 07 | `07_business_trip_allowances.sql` | business_trip_allowances | 出差补助表 |
| 08 | `08_meal_records.sql` | meal_records | 就餐记录表 |
| 09 | `09_documents.sql` | documents | 文档管理表（S3存储路径） |
| 10 | `10_audit_logs.sql` | audit_logs | 操作日志表 |
| 11 | `11_users.sql` | users | 用户权限表 |

## 🔐 敏感数据加密字段

员工表中以下字段采用AES-256加密存储：

- `name_encrypted` - 员工姓名
- `phone_encrypted` - 手机号码
- `id_card_encrypted` - 身份证号
- `bank_card_encrypted` - 银行卡号
- `birth_date_encrypted` - 出生日期

## 📁 文件存储字段

使用S3对象存储的字段：

- `id_card_front_s3_path` - 身份证正面照片路径
- `id_card_back_s3_path` - 身份证反面照片路径
- `receipt_s3_paths` - 出差补助票据路径（JSON数组）
- `s3_key` - 文档存储键

## 🚀 快速开始

### 方法1: 使用初始化脚本（推荐）

```bash
# 进入tables目录
cd database/tables

# 执行初始化脚本
mysql -u root -p hr_system < init_all_tables.sql
```

### 方法2: 逐个创建表

```bash
# 1. 创建数据库
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS hr_system DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 2. 按顺序执行各表脚本（注意依赖关系）
mysql -u root -p hr_system < 02_departments.sql
mysql -u root -p hr_system < 01_employees.sql
mysql -u root -p hr_system < 11_users.sql
mysql -u root -p hr_system < 03_onboarding_processes.sql
mysql -u root -p hr_system < 04_attendance_records.sql
mysql -u root -p hr_system < 05_annual_leaves.sql
mysql -u root -p hr_system < 06_social_security.sql
mysql -u root -p hr_system < 07_business_trip_allowances.sql
mysql -u root -p hr_system < 08_meal_records.sql
mysql -u root -p hr_system < 09_documents.sql
mysql -u root -p hr_system < 10_audit_logs.sql
```

### 方法3: 使用MySQL Workbench

1. 打开MySQL Workbench
2. 连接到数据库服务器
3. 依次打开并执行每个SQL文件

## 📊 表之间的关系

```
departments (部门)
    ↓ (1:N)
employees (员工) ← parent_id ← departments
    ↓ (1:1)
    ├─ users (用户账号)
    ↓ (1:N)
    ├─ onboarding_processes (入职流程)
    ├─ attendance_records (考勤记录)
    ├─ annual_leaves (年假管理)
    ├─ social_security (社保公积金)
    ├─ business_trip_allowances (出差补助)
    ├─ meal_records (就餐记录)
    └─ documents (文档管理)

audit_logs (操作日志) - 独立表，记录所有操作
```

## 🔧 维护命令

### 查看所有表

```sql
USE hr_system;
SHOW TABLES;
```

### 查看表结构

```sql
-- 查看员工表结构
DESCRIBE employees;

-- 查看表详细信息
SHOW CREATE TABLE employees;
```

### 查看表大小统计

```sql
SELECT 
    TABLE_NAME AS '表名',
    TABLE_ROWS AS '行数',
    ROUND(DATA_LENGTH / 1024 / 1024, 2) AS '数据大小(MB)',
    ROUND(INDEX_LENGTH / 1024 / 1024, 2) AS '索引大小(MB)',
    TABLE_COMMENT AS '说明'
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'hr_system'
ORDER BY DATA_LENGTH DESC;
```

### 查看外键关系

```sql
SELECT 
    TABLE_NAME AS '表名',
    COLUMN_NAME AS '列名',
    CONSTRAINT_NAME AS '约束名',
    REFERENCED_TABLE_NAME AS '引用表',
    REFERENCED_COLUMN_NAME AS '引用列'
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'hr_system'
    AND REFERENCED_TABLE_NAME IS NOT NULL;
```

## 🗑️ 清理和重建

### 删除所有表（谨慎操作！）

```sql
-- 禁用外键检查
SET FOREIGN_KEY_CHECKS = 0;

-- 删除所有表
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS documents;
DROP TABLE IF EXISTS meal_records;
DROP TABLE IF EXISTS business_trip_allowances;
DROP TABLE IF EXISTS social_security;
DROP TABLE IF EXISTS annual_leaves;
DROP TABLE IF EXISTS attendance_records;
DROP TABLE IF EXISTS onboarding_processes;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS employees;
DROP TABLE IF EXISTS departments;

-- 启用外键检查
SET FOREIGN_KEY_CHECKS = 1;
```

### 重建所有表

```bash
# 删除并重建
mysql -u root -p hr_system < drop_all_tables.sql
mysql -u root -p hr_system < init_all_tables.sql
```

## 📝 注意事项

1. **执行顺序**: 由于外键约束，必须按照依赖关系顺序创建表
2. **字符集**: 所有表使用 `utf8mb4` 字符集，支持emoji等特殊字符
3. **主键**: 所有表使用 UUID 作为主键，保证分布式环境下的唯一性
4. **时间戳**: 使用 `TIMESTAMP` 类型，自动处理时区转换
5. **JSON字段**: 用于存储灵活的结构化数据（如权限列表、标签等）
6. **BLOB字段**: 用于存储加密后的敏感数据

## 🔒 安全建议

1. **敏感数据**: 姓名、手机号、身份证号等敏感信息必须加密存储
2. **访问控制**: 为应用创建专用数据库用户，不要使用root用户
3. **最小权限**: 应用用户只授予必要的权限（SELECT, INSERT, UPDATE, DELETE）
4. **备份策略**: 建立定期备份机制，保护数据安全
5. **审计日志**: 启用操作日志记录，追踪所有敏感操作

## 📖 相关文档

- [数据库设计文档](../docs/database.md)
- [后端开发文档](../docs/backend.md)
- [API接口文档](../docs/api.md)

## 🆘 常见问题

### Q: 执行SQL文件时报错：外键约束失败
A: 确保按照正确的顺序创建表，先创建被引用的表（如departments），再创建引用它的表（如employees）

### Q: 如何修改已存在的表结构？
A: 使用ALTER TABLE语句，例如：
```sql
ALTER TABLE employees ADD COLUMN new_field VARCHAR(50);
```

### Q: 如何备份数据库？
A: 使用mysqldump命令：
```bash
mysqldump -u root -p hr_system > hr_system_backup.sql
```

### Q: 如何恢复备份？
A: 使用mysql命令：
```bash
mysql -u root -p hr_system < hr_system_backup.sql
```
