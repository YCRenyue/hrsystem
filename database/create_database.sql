-- HR System Database Creation Script
-- Usage: mysql -u root -p < create_database.sql

-- Drop existing database if exists
DROP DATABASE IF EXISTS hr_system;

-- Create database with UTF8MB4 charset
CREATE DATABASE hr_system
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

-- Use the database
USE hr_system;

-- Display success message
SELECT 'Database hr_system created successfully!' AS Status;

-- Show database info
SELECT @@character_set_database AS charset, @@collation_database AS collation;

-- Create application user (optional)
-- Uncomment the lines below if you want to create a dedicated user

-- DROP USER IF EXISTS 'hr_user'@'localhost';
-- CREATE USER 'hr_user'@'localhost' IDENTIFIED BY 'Hr@123456';
-- GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, INDEX, ALTER ON hr_system.* TO 'hr_user'@'localhost';
-- FLUSH PRIVILEGES;
-- SELECT 'User hr_user created successfully!' AS Status;
