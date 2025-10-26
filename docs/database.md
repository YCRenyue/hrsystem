# 数据库设计文档

## 1. 数据库架构

### 1.1 数据库选择
- **主数据库**: MySQL 8.0 - 关系型数据存储
- **文件存储**: Amazon S3 - 文档和图片存储

### 1.2 数据安全
- **数据加密**: AES-256 加密敏感信息（姓名、身份证、银行卡、电话等）
- **传输加密**: TLS 1.3 保护数据传输
- **访问控制**: 基于角色的数据库访问权限
- **审计日志**: 完整的数据操作审计跟踪

### 1.3 性能优化
- **读写分离**: 主从复制配置
- **分库分表**: 按部门或时间分片
- **索引优化**: 针对查询场景的复合索引
- **连接池**: 数据库连接池管理

## 2. 核心表结构

### 2.1 用户管理表

#### users - 系统用户表
```sql
CREATE TABLE `users` (
  `user_id` VARCHAR(36) PRIMARY KEY COMMENT '用户ID (UUID)',
  `username` VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名',
  `password_hash` VARCHAR(255) NOT NULL COMMENT '密码哈希',
  `email` VARCHAR(100) NOT NULL UNIQUE COMMENT '邮箱',
  `phone` VARCHAR(20) COMMENT '手机号',
  `role` ENUM('super_admin', 'hr_admin', 'hr_specialist', 'department_manager', 'employee') NOT NULL DEFAULT 'employee' COMMENT '角色',
  `status` ENUM('active', 'inactive', 'locked') NOT NULL DEFAULT 'active' COMMENT '状态',
  `last_login_time` DATETIME COMMENT '最后登录时间',
  `login_attempts` INT DEFAULT 0 COMMENT '登录失败次数',
  `locked_until` DATETIME COMMENT '锁定到期时间',
  `dingtalk_user_id` VARCHAR(100) COMMENT '钉钉用户ID',
  `avatar_url` VARCHAR(255) COMMENT '头像URL',
  `created_by` VARCHAR(36) COMMENT '创建人ID',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_username` (`username`),
  INDEX `idx_email` (`email`),
  INDEX `idx_role` (`role`),
  INDEX `idx_dingtalk_user_id` (`dingtalk_user_id`)
) ENGINE=InnoDB COMMENT='系统用户表';
```

#### user_permissions - 用户权限表
```sql
CREATE TABLE `user_permissions` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `user_id` VARCHAR(36) NOT NULL COMMENT '用户ID',
  `permission` VARCHAR(100) NOT NULL COMMENT '权限标识',
  `resource` VARCHAR(100) COMMENT '资源标识',
  `granted_by` VARCHAR(36) COMMENT '授权人ID',
  `granted_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '授权时间',
  `expires_at` DATETIME COMMENT '过期时间',
  UNIQUE KEY `uk_user_permission` (`user_id`, `permission`, `resource`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE,
  INDEX `idx_permission` (`permission`)
) ENGINE=InnoDB COMMENT='用户权限表';
```

### 2.2 组织架构表

#### departments - 部门表
```sql
CREATE TABLE `departments` (
  `department_id` VARCHAR(36) PRIMARY KEY COMMENT '部门ID (UUID)',
  `department_code` VARCHAR(20) NOT NULL UNIQUE COMMENT '部门编码',
  `department_name` VARCHAR(100) NOT NULL COMMENT '部门名称',
  `parent_id` VARCHAR(36) COMMENT '上级部门ID',
  `manager_id` VARCHAR(36) COMMENT '部门负责人ID',
  `level` INT NOT NULL DEFAULT 1 COMMENT '部门层级',
  `sort_order` INT DEFAULT 0 COMMENT '排序序号',
  `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active' COMMENT '状态',
  `description` TEXT COMMENT '部门描述',
  `dingtalk_dept_id` VARCHAR(100) COMMENT '钉钉部门ID',
  `created_by` VARCHAR(36) COMMENT '创建人ID',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  FOREIGN KEY (`parent_id`) REFERENCES `departments`(`department_id`) ON DELETE SET NULL,
  FOREIGN KEY (`manager_id`) REFERENCES `users`(`user_id`) ON DELETE SET NULL,
  INDEX `idx_parent_id` (`parent_id`),
  INDEX `idx_manager_id` (`manager_id`),
  INDEX `idx_dingtalk_dept_id` (`dingtalk_dept_id`)
) ENGINE=InnoDB COMMENT='部门表';
```

#### positions - 职位表
```sql
CREATE TABLE `positions` (
  `position_id` VARCHAR(36) PRIMARY KEY COMMENT '职位ID (UUID)',
  `position_code` VARCHAR(20) NOT NULL UNIQUE COMMENT '职位编码',
  `position_name` VARCHAR(100) NOT NULL COMMENT '职位名称',
  `department_id` VARCHAR(36) NOT NULL COMMENT '所属部门ID',
  `level` ENUM('junior', 'intermediate', 'senior', 'expert', 'manager', 'director', 'vp', 'ceo') NOT NULL COMMENT '职级',
  `salary_range_min` DECIMAL(10,2) COMMENT '薪资范围最小值',
  `salary_range_max` DECIMAL(10,2) COMMENT '薪资范围最大值',
  `requirements` TEXT COMMENT '职位要求',
  `responsibilities` TEXT COMMENT '工作职责',
  `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active' COMMENT '状态',
  `created_by` VARCHAR(36) COMMENT '创建人ID',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  FOREIGN KEY (`department_id`) REFERENCES `departments`(`department_id`) ON DELETE CASCADE,
  INDEX `idx_department_id` (`department_id`),
  INDEX `idx_level` (`level`)
) ENGINE=InnoDB COMMENT='职位表';
```

### 2.3 员工信息表

#### employees - 员工基础信息表
```sql
CREATE TABLE `employees` (
  `employee_id` VARCHAR(36) PRIMARY KEY COMMENT '员工ID (UUID)',
  `employee_number` VARCHAR(20) NOT NULL UNIQUE COMMENT '工号',
  `user_id` VARCHAR(36) UNIQUE COMMENT '关联用户ID',
  `name_encrypted` TEXT NOT NULL COMMENT '姓名（加密）',
  `name_hash` VARCHAR(64) COMMENT '姓名哈希（用于搜索）',
  `name_en` VARCHAR(100) COMMENT '英文姓名',
  `gender` ENUM('male', 'female') NOT NULL COMMENT '性别',
  `birth_date_encrypted` TEXT COMMENT '出生日期（加密）',
  `id_card_encrypted` TEXT COMMENT '身份证号（加密）',
  `phone_encrypted` TEXT COMMENT '手机号（加密）',
  `phone_hash` VARCHAR(64) COMMENT '手机号哈希（用于搜索）',
  `email` VARCHAR(100) COMMENT '邮箱',
  `bank_card_encrypted` TEXT COMMENT '银行卡号（加密）',
  `emergency_contact` VARCHAR(50) COMMENT '紧急联系人',
  `emergency_phone_encrypted` TEXT COMMENT '紧急联系电话（加密）',
  `address` TEXT COMMENT '家庭住址',
  `avatar_url` VARCHAR(255) COMMENT '头像URL',
  `id_card_front_s3_path` VARCHAR(500) COMMENT '身份证正面S3路径',
  `id_card_back_s3_path` VARCHAR(500) COMMENT '身份证背面S3路径',
  `hire_date` DATE NOT NULL COMMENT '入职日期',
  `probation_end_date` DATE COMMENT '试用期结束日期',
  `department_id` VARCHAR(36) NOT NULL COMMENT '部门ID',
  `position_id` VARCHAR(36) NOT NULL COMMENT '职位ID',
  `manager_id` VARCHAR(36) COMMENT '直属上级ID',
  `work_location` VARCHAR(100) COMMENT '工作地点',
  `employment_type` ENUM('full_time', 'part_time', 'intern', 'contractor') NOT NULL DEFAULT 'full_time' COMMENT '雇佣类型',
  `employment_status` ENUM('pending', 'probation', 'regular', 'resigned', 'terminated') NOT NULL DEFAULT 'pending' COMMENT '雇佣状态',
  `resignation_date` DATE COMMENT '离职日期',
  `resignation_reason` TEXT COMMENT '离职原因',
  `data_complete` BOOLEAN DEFAULT FALSE COMMENT '资料是否完整',
  `dingtalk_user_id` VARCHAR(100) COMMENT '钉钉用户ID',
  `remarks` TEXT COMMENT '备注',
  `created_by` VARCHAR(36) COMMENT '创建人ID',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE SET NULL,
  FOREIGN KEY (`department_id`) REFERENCES `departments`(`department_id`) ON DELETE RESTRICT,
  FOREIGN KEY (`position_id`) REFERENCES `positions`(`position_id`) ON DELETE RESTRICT,
  FOREIGN KEY (`manager_id`) REFERENCES `employees`(`employee_id`) ON DELETE SET NULL,
  INDEX `idx_employee_number` (`employee_number`),
  INDEX `idx_name_hash` (`name_hash`),
  INDEX `idx_phone_hash` (`phone_hash`),
  INDEX `idx_department_id` (`department_id`),
  INDEX `idx_position_id` (`position_id`),
  INDEX `idx_manager_id` (`manager_id`),
  INDEX `idx_hire_date` (`hire_date`),
  INDEX `idx_employment_status` (`employment_status`),
  INDEX `idx_dingtalk_user_id` (`dingtalk_user_id`)
) ENGINE=InnoDB COMMENT='员工基础信息表';
```

#### employee_contracts - 员工合同表
```sql
CREATE TABLE `employee_contracts` (
  `contract_id` VARCHAR(36) PRIMARY KEY COMMENT '合同ID (UUID)',
  `employee_id` VARCHAR(36) NOT NULL COMMENT '员工ID',
  `contract_number` VARCHAR(50) NOT NULL UNIQUE COMMENT '合同编号',
  `contract_type` ENUM('labor', 'internship', 'dispatch', 'consultant') NOT NULL COMMENT '合同类型',
  `start_date` DATE NOT NULL COMMENT '合同开始日期',
  `end_date` DATE COMMENT '合同结束日期',
  `probation_months` INT DEFAULT 0 COMMENT '试用期月数',
  `salary_amount` DECIMAL(10,2) COMMENT '基础薪资',
  `salary_structure` JSON COMMENT '薪资结构JSON',
  `working_hours` INT DEFAULT 8 COMMENT '每日工作小时数',
  `annual_leave_days` INT DEFAULT 5 COMMENT '年假天数',
  `contract_file_path` VARCHAR(255) COMMENT '合同文件路径',
  `status` ENUM('draft', 'active', 'expired', 'terminated') NOT NULL DEFAULT 'draft' COMMENT '合同状态',
  `signed_date` DATE COMMENT '签署日期',
  `notes` TEXT COMMENT '备注',
  `created_by` VARCHAR(36) COMMENT '创建人ID',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  FOREIGN KEY (`employee_id`) REFERENCES `employees`(`employee_id`) ON DELETE CASCADE,
  INDEX `idx_employee_id` (`employee_id`),
  INDEX `idx_contract_number` (`contract_number`),
  INDEX `idx_start_date` (`start_date`),
  INDEX `idx_end_date` (`end_date`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB COMMENT='员工合同表';
```

### 2.4 入职流程表

#### onboarding_processes - 入职流程表
```sql
CREATE TABLE `onboarding_processes` (
  `process_id` VARCHAR(36) PRIMARY KEY COMMENT '流程ID (UUID)',
  `employee_id` VARCHAR(36) NOT NULL COMMENT '员工ID',
  `form_token` VARCHAR(64) NOT NULL UNIQUE COMMENT '表单访问令牌',
  `form_link` VARCHAR(255) NOT NULL COMMENT '表单链接',
  `process_status` ENUM('created', 'sent', 'in_progress', 'completed', 'expired') NOT NULL DEFAULT 'created' COMMENT '流程状态',
  `notification_method` ENUM('dingtalk', 'sms', 'email', 'manual') COMMENT '通知方式',
  `sent_time` DATETIME COMMENT '发送时间',
  `started_time` DATETIME COMMENT '开始填写时间',
  `completed_time` DATETIME COMMENT '完成时间',
  `expires_at` DATETIME COMMENT '过期时间',
  `completion_rate` DECIMAL(5,2) DEFAULT 0.00 COMMENT '完成率',
  `current_step` INT DEFAULT 1 COMMENT '当前步骤',
  `total_steps` INT DEFAULT 5 COMMENT '总步骤数',
  `form_data` JSON COMMENT '表单数据JSON',
  `notes` TEXT COMMENT '备注',
  `created_by` VARCHAR(36) COMMENT '创建人ID',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  FOREIGN KEY (`employee_id`) REFERENCES `employees`(`employee_id`) ON DELETE CASCADE,
  INDEX `idx_employee_id` (`employee_id`),
  INDEX `idx_form_token` (`form_token`),
  INDEX `idx_process_status` (`process_status`),
  INDEX `idx_sent_time` (`sent_time`),
  INDEX `idx_expires_at` (`expires_at`)
) ENGINE=InnoDB COMMENT='入职流程表';
```

#### onboarding_steps - 入职步骤表
```sql
CREATE TABLE `onboarding_steps` (
  `step_id` VARCHAR(36) PRIMARY KEY COMMENT '步骤ID (UUID)',
  `process_id` VARCHAR(36) NOT NULL COMMENT '流程ID',
  `step_number` INT NOT NULL COMMENT '步骤序号',
  `step_name` VARCHAR(100) NOT NULL COMMENT '步骤名称',
  `step_type` ENUM('form', 'document', 'approval', 'notification') NOT NULL COMMENT '步骤类型',
  `required_fields` JSON COMMENT '必填字段JSON',
  `optional_fields` JSON COMMENT '可选字段JSON',
  `status` ENUM('pending', 'in_progress', 'completed', 'skipped') NOT NULL DEFAULT 'pending' COMMENT '状态',
  `started_time` DATETIME COMMENT '开始时间',
  `completed_time` DATETIME COMMENT '完成时间',
  `assignee` VARCHAR(36) COMMENT '负责人ID',
  `form_data` JSON COMMENT '表单数据JSON',
  `documents` JSON COMMENT '文档信息JSON',
  `notes` TEXT COMMENT '备注',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  FOREIGN KEY (`process_id`) REFERENCES `onboarding_processes`(`process_id`) ON DELETE CASCADE,
  UNIQUE KEY `uk_process_step` (`process_id`, `step_number`),
  INDEX `idx_status` (`status`),
  INDEX `idx_assignee` (`assignee`)
) ENGINE=InnoDB COMMENT='入职步骤表';
```

### 2.5 文档管理表

#### employee_documents - 员工文档表
```sql
CREATE TABLE `employee_documents` (
  `document_id` VARCHAR(36) PRIMARY KEY COMMENT '文档ID (UUID)',
  `employee_id` VARCHAR(36) NOT NULL COMMENT '员工ID',
  `document_type` ENUM('id_card_front', 'id_card_back', 'diploma', 'certificate', 'contract', 'photo', 'resume', 'other') NOT NULL COMMENT '文档类型',
  `document_name` VARCHAR(255) NOT NULL COMMENT '文档名称',
  `s3_bucket` VARCHAR(100) NOT NULL COMMENT 'S3存储桶名称',
  `s3_key` VARCHAR(500) NOT NULL COMMENT 'S3对象键值',
  `s3_url` VARCHAR(1000) COMMENT 'S3访问URL',
  `file_size` BIGINT COMMENT '文件大小(字节)',
  `file_type` VARCHAR(50) COMMENT '文件MIME类型',
  `file_hash` VARCHAR(64) COMMENT '文件MD5哈希值',
  `is_encrypted` BOOLEAN DEFAULT TRUE COMMENT '是否加密存储',
  `encryption_key_id` VARCHAR(100) COMMENT '加密密钥ID',
  `is_required` BOOLEAN DEFAULT FALSE COMMENT '是否必需',
  `status` ENUM('pending', 'reviewing', 'approved', 'rejected') NOT NULL DEFAULT 'pending' COMMENT '审核状态',
  `reviewed_by` VARCHAR(36) COMMENT '审核人ID',
  `reviewed_at` DATETIME COMMENT '审核时间',
  `review_notes` TEXT COMMENT '审核备注',
  `uploaded_by` VARCHAR(36) COMMENT '上传人ID',
  `retention_expires_at` DATETIME COMMENT '保留期过期时间',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  FOREIGN KEY (`employee_id`) REFERENCES `employees`(`employee_id`) ON DELETE CASCADE,
  INDEX `idx_employee_id` (`employee_id`),
  INDEX `idx_document_type` (`document_type`),
  INDEX `idx_status` (`status`),
  INDEX `idx_reviewed_by` (`reviewed_by`),
  INDEX `idx_s3_bucket_key` (`s3_bucket`, `s3_key`)
) ENGINE=InnoDB COMMENT='员工文档表';
```

### 2.6 通知消息表

#### notifications - 通知表
```sql
CREATE TABLE `notifications` (
  `notification_id` VARCHAR(36) PRIMARY KEY COMMENT '通知ID (UUID)',
  `recipient_id` VARCHAR(36) NOT NULL COMMENT '接收人ID',
  `sender_id` VARCHAR(36) COMMENT '发送人ID',
  `title` VARCHAR(255) NOT NULL COMMENT '通知标题',
  `content` TEXT NOT NULL COMMENT '通知内容',
  `type` ENUM('system', 'onboarding', 'approval', 'reminder', 'announcement') NOT NULL COMMENT '通知类型',
  `priority` ENUM('low', 'medium', 'high', 'urgent') NOT NULL DEFAULT 'medium' COMMENT '优先级',
  `channel` ENUM('app', 'dingtalk', 'sms', 'email') NOT NULL DEFAULT 'app' COMMENT '通知渠道',
  `status` ENUM('pending', 'sent', 'delivered', 'read', 'failed') NOT NULL DEFAULT 'pending' COMMENT '状态',
  `read_at` DATETIME COMMENT '阅读时间',
  `sent_at` DATETIME COMMENT '发送时间',
  `expires_at` DATETIME COMMENT '过期时间',
  `related_type` VARCHAR(50) COMMENT '关联对象类型',
  `related_id` VARCHAR(36) COMMENT '关联对象ID',
  `metadata` JSON COMMENT '元数据JSON',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  FOREIGN KEY (`recipient_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE,
  FOREIGN KEY (`sender_id`) REFERENCES `users`(`user_id`) ON DELETE SET NULL,
  INDEX `idx_recipient_id` (`recipient_id`),
  INDEX `idx_type` (`type`),
  INDEX `idx_status` (`status`),
  INDEX `idx_created_at` (`created_at`),
  INDEX `idx_related` (`related_type`, `related_id`)
) ENGINE=InnoDB COMMENT='通知表';
```

### 2.7 审计日志表

#### audit_logs - 审计日志表
```sql
CREATE TABLE `audit_logs` (
  `log_id` VARCHAR(36) PRIMARY KEY COMMENT '日志ID (UUID)',
  `user_id` VARCHAR(36) COMMENT '操作用户ID',
  `action` VARCHAR(100) NOT NULL COMMENT '操作动作',
  `resource_type` VARCHAR(50) NOT NULL COMMENT '资源类型',
  `resource_id` VARCHAR(36) COMMENT '资源ID',
  `ip_address` VARCHAR(45) COMMENT 'IP地址',
  `user_agent` TEXT COMMENT '用户代理',
  `request_method` VARCHAR(10) COMMENT 'HTTP方法',
  `request_url` VARCHAR(500) COMMENT '请求URL',
  `request_params` JSON COMMENT '请求参数JSON',
  `response_status` INT COMMENT '响应状态码',
  `old_values` JSON COMMENT '修改前值JSON',
  `new_values` JSON COMMENT '修改后值JSON',
  `execution_time` INT COMMENT '执行时间(毫秒)',
  `success` BOOLEAN NOT NULL DEFAULT TRUE COMMENT '是否成功',
  `error_message` TEXT COMMENT '错误信息',
  `session_id` VARCHAR(128) COMMENT '会话ID',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE SET NULL,
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_action` (`action`),
  INDEX `idx_resource` (`resource_type`, `resource_id`),
  INDEX `idx_created_at` (`created_at`),
  INDEX `idx_ip_address` (`ip_address`)
) ENGINE=InnoDB COMMENT='审计日志表';
```

## 3. 数据库索引优化

### 3.1 复合索引策略
```sql
-- 员工查询复合索引
ALTER TABLE employees ADD INDEX `idx_dept_status_hire` (`department_id`, `employment_status`, `hire_date`);

-- 入职流程查询索引
ALTER TABLE onboarding_processes ADD INDEX `idx_status_created` (`process_status`, `created_at`);

-- 通知查询索引
ALTER TABLE notifications ADD INDEX `idx_recipient_status_type` (`recipient_id`, `status`, `type`);

-- 审计日志查询索引
ALTER TABLE audit_logs ADD INDEX `idx_user_action_time` (`user_id`, `action`, `created_at`);
```

### 3.2 分区表设计
```sql
-- 审计日志按月分区
ALTER TABLE audit_logs PARTITION BY RANGE (YEAR(created_at) * 100 + MONTH(created_at)) (
    PARTITION p202501 VALUES LESS THAN (202502),
    PARTITION p202502 VALUES LESS THAN (202503),
    PARTITION p202503 VALUES LESS THAN (202504),
    PARTITION p202504 VALUES LESS THAN (202505),
    PARTITION p202505 VALUES LESS THAN (202506),
    PARTITION p202506 VALUES LESS THAN (202507),
    PARTITION p202507 VALUES LESS THAN (202508),
    PARTITION p202508 VALUES LESS THAN (202509),
    PARTITION p202509 VALUES LESS THAN (202510),
    PARTITION p202510 VALUES LESS THAN (202511),
    PARTITION p202511 VALUES LESS THAN (202512),
    PARTITION p202512 VALUES LESS THAN (202513),
    PARTITION pmax VALUES LESS THAN MAXVALUE
);

-- 通知表按时间分区
ALTER TABLE notifications PARTITION BY RANGE (TO_DAYS(created_at)) (
    PARTITION p_current VALUES LESS THAN (TO_DAYS('2025-02-01')),
    PARTITION p_next VALUES LESS THAN (TO_DAYS('2025-03-01')),
    PARTITION pmax VALUES LESS THAN MAXVALUE
);
```

## 4. 数据迁移脚本

### 4.1 初始化数据
```sql
-- 创建默认部门
INSERT INTO departments (department_id, department_code, department_name, level, created_by) VALUES
('dept-001', 'TECH', '技术部', 1, 'system'),
('dept-002', 'HR', '人力资源部', 1, 'system'),
('dept-003', 'FINANCE', '财务部', 1, 'system'),
('dept-004', 'MARKETING', '市场部', 1, 'system'),
('dept-005', 'SALES', '销售部', 1, 'system');

-- 创建默认职位
INSERT INTO positions (position_id, position_code, position_name, department_id, level, created_by) VALUES
('pos-001', 'TECH-001', '软件工程师', 'dept-001', 'intermediate', 'system'),
('pos-002', 'TECH-002', '高级软件工程师', 'dept-001', 'senior', 'system'),
('pos-003', 'TECH-003', '技术经理', 'dept-001', 'manager', 'system'),
('pos-004', 'HR-001', 'HR专员', 'dept-002', 'junior', 'system'),
('pos-005', 'HR-002', 'HR经理', 'dept-002', 'manager', 'system');

-- 创建默认管理员用户
INSERT INTO users (user_id, username, password_hash, email, role, created_by) VALUES
('admin-001', 'admin', '$2b$10$example_hash', 'admin@company.com', 'super_admin', 'system');

-- 创建默认权限
INSERT INTO user_permissions (user_id, permission, granted_by) VALUES
('admin-001', 'employee.read', 'system'),
('admin-001', 'employee.write', 'system'),
('admin-001', 'employee.delete', 'system'),
('admin-001', 'department.manage', 'system'),
('admin-001', 'user.manage', 'system'),
('admin-001', 'system.admin', 'system');
```

### 4.2 数据清理脚本
```sql
-- 清理过期的入职流程
DELETE FROM onboarding_processes 
WHERE process_status = 'expired' 
AND expires_at < DATE_SUB(NOW(), INTERVAL 30 DAY);

-- 清理已读的通知（保留30天）
DELETE FROM notifications 
WHERE status = 'read' 
AND read_at < DATE_SUB(NOW(), INTERVAL 30 DAY);

-- 清理旧的审计日志（保留1年）
DELETE FROM audit_logs 
WHERE created_at < DATE_SUB(NOW(), INTERVAL 1 YEAR);
```

## 5. 数据库存储过程

### 5.1 员工统计存储过程
```sql
DELIMITER $$
CREATE PROCEDURE GetEmployeeStatistics(
    IN p_department_id VARCHAR(36),
    IN p_start_date DATE,
    IN p_end_date DATE
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    SELECT 
        d.department_name,
        COUNT(e.employee_id) as total_employees,
        COUNT(CASE WHEN e.employment_status = 'regular' THEN 1 END) as regular_employees,
        COUNT(CASE WHEN e.employment_status = 'probation' THEN 1 END) as probation_employees,
        COUNT(CASE WHEN e.hire_date BETWEEN p_start_date AND p_end_date THEN 1 END) as new_hires,
        COUNT(CASE WHEN e.resignation_date BETWEEN p_start_date AND p_end_date THEN 1 END) as resignations
    FROM departments d
    LEFT JOIN employees e ON d.department_id = e.department_id
    WHERE (p_department_id IS NULL OR d.department_id = p_department_id)
    GROUP BY d.department_id, d.department_name
    ORDER BY d.department_name;
END$$
DELIMITER ;
```

### 5.2 入职流程监控存储过程
```sql
DELIMITER $$
CREATE PROCEDURE MonitorOnboardingProcesses()
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    -- 标记过期的流程
    UPDATE onboarding_processes 
    SET process_status = 'expired' 
    WHERE process_status IN ('sent', 'in_progress') 
    AND expires_at < NOW();
    
    -- 获取需要提醒的流程
    SELECT 
        op.process_id,
        e.name as employee_name,
        e.phone,
        e.email,
        op.process_status,
        op.sent_time,
        op.expires_at,
        TIMESTAMPDIFF(HOUR, NOW(), op.expires_at) as hours_remaining
    FROM onboarding_processes op
    JOIN employees e ON op.employee_id = e.employee_id
    WHERE op.process_status = 'sent'
    AND op.expires_at > NOW()
    AND TIMESTAMPDIFF(HOUR, NOW(), op.expires_at) <= 24;
END$$
DELIMITER ;
```

## 6. 视图定义

### 6.1 员工信息视图
```sql
CREATE VIEW v_employee_info AS
SELECT 
    e.employee_id,
    e.employee_number,
    e.name,
    e.gender,
    e.phone,
    e.email,
    e.hire_date,
    e.employment_status,
    d.department_name,
    p.position_name,
    p.level as position_level,
    m.name as manager_name,
    u.username,
    u.last_login_time,
    e.data_complete,
    e.created_at
FROM employees e
LEFT JOIN departments d ON e.department_id = d.department_id
LEFT JOIN positions p ON e.position_id = p.position_id
LEFT JOIN employees m ON e.manager_id = m.employee_id
LEFT JOIN users u ON e.user_id = u.user_id
WHERE e.employment_status != 'terminated';
```

### 6.2 入职流程统计视图
```sql
CREATE VIEW v_onboarding_stats AS
SELECT 
    DATE(op.created_at) as process_date,
    COUNT(*) as total_processes,
    COUNT(CASE WHEN op.process_status = 'completed' THEN 1 END) as completed_count,
    COUNT(CASE WHEN op.process_status = 'in_progress' THEN 1 END) as in_progress_count,
    COUNT(CASE WHEN op.process_status = 'expired' THEN 1 END) as expired_count,
    ROUND(AVG(op.completion_rate), 2) as avg_completion_rate,
    AVG(TIMESTAMPDIFF(HOUR, op.sent_time, op.completed_time)) as avg_completion_hours
FROM onboarding_processes op
GROUP BY DATE(op.created_at)
ORDER BY process_date DESC;
```

## 7. 触发器

### 7.1 员工状态变更触发器
```sql
DELIMITER $$
CREATE TRIGGER tr_employee_status_change
AFTER UPDATE ON employees
FOR EACH ROW
BEGIN
    IF OLD.employment_status != NEW.employment_status THEN
        INSERT INTO audit_logs (
            log_id,
            user_id,
            action,
            resource_type,
            resource_id,
            old_values,
            new_values,
            created_at
        ) VALUES (
            UUID(),
            NEW.updated_by,
            'status_change',
            'employee',
            NEW.employee_id,
            JSON_OBJECT('employment_status', OLD.employment_status),
            JSON_OBJECT('employment_status', NEW.employment_status),
            NOW()
        );
    END IF;
END$$
DELIMITER ;
```

### 7.2 通知自动标记触发器
```sql
DELIMITER $$
CREATE TRIGGER tr_notification_auto_expire
BEFORE UPDATE ON notifications
FOR EACH ROW
BEGIN
    IF NEW.expires_at < NOW() AND OLD.status != 'expired' THEN
        SET NEW.status = 'expired';
    END IF;
END$$
DELIMITER ;
```

## 8. 数据库性能监控

### 8.1 慢查询监控
```sql
-- 开启慢查询日志
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 2;
SET GLOBAL log_queries_not_using_indexes = 'ON';

-- 查询慢查询统计
SELECT 
    query_time,
    lock_time,
    rows_sent,
    rows_examined,
    sql_text
FROM mysql.slow_log 
ORDER BY query_time DESC 
LIMIT 10;
```

### 8.2 索引使用分析
```sql
-- 查看未使用的索引
SELECT 
    t.TABLE_SCHEMA as db_name,
    t.TABLE_NAME as table_name,
    s.INDEX_NAME as index_name,
    s.CARDINALITY
FROM information_schema.TABLES t
LEFT JOIN information_schema.STATISTICS s ON t.TABLE_SCHEMA = s.TABLE_SCHEMA AND t.TABLE_NAME = s.TABLE_NAME
LEFT JOIN performance_schema.table_io_waits_summary_by_index_usage i ON i.OBJECT_SCHEMA = s.TABLE_SCHEMA AND i.OBJECT_NAME = s.TABLE_NAME AND i.INDEX_NAME = s.INDEX_NAME
WHERE t.TABLE_SCHEMA = 'hrsystem'
AND s.INDEX_NAME IS NOT NULL
AND s.INDEX_NAME != 'PRIMARY'
AND i.INDEX_NAME IS NULL;
```

## 9. 备份与恢复

### 9.1 备份脚本
```bash
#!/bin/bash
# 数据库备份脚本

DB_HOST="localhost"
DB_USER="backup_user"
DB_PASS="backup_password"
DB_NAME="hrsystem"
BACKUP_DIR="/backup/mysql"
DATE=$(date +"%Y%m%d_%H%M%S")

# 创建备份目录
mkdir -p $BACKUP_DIR

# 全量备份
mysqldump -h$DB_HOST -u$DB_USER -p$DB_PASS \
    --single-transaction \
    --routines \
    --triggers \
    --events \
    --master-data=2 \
    $DB_NAME > $BACKUP_DIR/hrsystem_full_$DATE.sql

# 压缩备份文件
gzip $BACKUP_DIR/hrsystem_full_$DATE.sql

# 清理7天前的备份
find $BACKUP_DIR -name "hrsystem_full_*.sql.gz" -mtime +7 -delete

echo "数据库备份完成: hrsystem_full_$DATE.sql.gz"
```

### 9.2 恢复脚本
```bash
#!/bin/bash
# 数据库恢复脚本

if [ $# -ne 1 ]; then
    echo "使用方法: $0 backup_file.sql.gz"
    exit 1
fi

BACKUP_FILE=$1
DB_HOST="localhost"
DB_USER="root"
DB_PASS="password"
DB_NAME="hrsystem"

# 解压备份文件
gunzip -c $BACKUP_FILE > /tmp/restore.sql

# 创建数据库
mysql -h$DB_HOST -u$DB_USER -p$DB_PASS -e "CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 恢复数据
mysql -h$DB_HOST -u$DB_USER -p$DB_PASS $DB_NAME < /tmp/restore.sql

# 清理临时文件
rm /tmp/restore.sql

echo "数据库恢复完成"
```

## 10. 数据库连接池配置

### 10.1 MySQL连接池
```typescript
// database.config.ts
export const databaseConfig = {
  type: 'mysql' as const,
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '3306'),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  
  // 连接池配置
  extra: {
    connectionLimit: 20,        // 最大连接数
    acquireTimeout: 60000,      // 获取连接超时时间
    timeout: 60000,             // 查询超时时间
    reconnect: true,            // 自动重连
    charset: 'utf8mb4',         // 字符集
    timezone: 'Z'               // 时区
## 10. 数据库连接池配置

### 10.1 MySQL连接池
```python
# database.py
from sqlalchemy import create_engine
from sqlalchemy.pool import QueuePool
from sqlalchemy.orm import sessionmaker
import os

# 数据库配置
DATABASE_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': int(os.getenv('DB_PORT', '3306')),
    'username': os.getenv('DB_USERNAME', 'root'),
    'password': os.getenv('DB_PASSWORD', ''),
    'database': os.getenv('DB_DATABASE', 'hrsystem'),
    'charset': 'utf8mb4'
}

# 连接池配置
ENGINE_CONFIG = {
    'pool_size': 20,                    # 连接池大小
    'max_overflow': 30,                 # 超过连接池大小的连接数
    'pool_timeout': 30,                 # 获取连接超时时间
    'pool_recycle': 3600,              # 连接回收时间(秒)
    'pool_pre_ping': True,             # 连接前ping检查
    'echo': os.getenv('DB_ECHO', 'false').lower() == 'true'  # SQL日志
}

# 创建数据库引擎
DATABASE_URL = f"mysql+pymysql://{DATABASE_CONFIG['username']}:{DATABASE_CONFIG['password']}@{DATABASE_CONFIG['host']}:{DATABASE_CONFIG['port']}/{DATABASE_CONFIG['database']}?charset={DATABASE_CONFIG['charset']}"

engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    **ENGINE_CONFIG
)

# 创建会话工厂
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 数据库依赖
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

### 10.2 S3存储配置
```python
# s3_config.py
import boto3
from botocore.config import Config
import os

S3_CONFIG = {
    'aws_access_key_id': os.getenv('AWS_ACCESS_KEY_ID'),
    'aws_secret_access_key': os.getenv('AWS_SECRET_ACCESS_KEY'),
    'region_name': os.getenv('AWS_DEFAULT_REGION', 'us-east-1'),
    'bucket_name': os.getenv('S3_BUCKET_NAME', 'hrsystem-documents')
}

# S3客户端配置
s3_config = Config(
    region_name=S3_CONFIG['region_name'],
    retries={
        'max_attempts': 3,
        'mode': 'adaptive'
    },
    max_pool_connections=50
)

# 创建S3客户端
s3_client = boto3.client(
    's3',
    aws_access_key_id=S3_CONFIG['aws_access_key_id'],
    aws_secret_access_key=S3_CONFIG['aws_secret_access_key'],
    config=s3_config
)

# S3资源
s3_resource = boto3.resource(
    's3',
    aws_access_key_id=S3_CONFIG['aws_access_key_id'],
    aws_secret_access_key=S3_CONFIG['aws_secret_access_key'],
    config=s3_config
)
```
