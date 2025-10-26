-- =============================================
-- 删除所有表的脚本
-- 警告: 此操作不可逆，将删除所有数据！
-- 使用方法: mysql -u root -p hr_system < drop_all_tables.sql
-- =============================================

USE hr_system;

-- 禁用外键检查
SET FOREIGN_KEY_CHECKS = 0;

-- 删除所有表（按反向依赖顺序）
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

-- 显示剩余的表
SHOW TABLES;

SELECT '✅ 所有表已删除' AS '状态';
