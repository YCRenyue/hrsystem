-- =============================================
-- 员工信息表
-- 表名: employees
-- 说明: 存储员工基本信息，敏感字段加密存储
-- =============================================

CREATE TABLE IF NOT EXISTS employees (
    -- 主键
    employee_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    
    -- 基本信息
    employee_number VARCHAR(50) NOT NULL UNIQUE COMMENT '工号',
    email VARCHAR(100) COMMENT '邮箱',
    
    -- 加密敏感信息（使用AES-256加密）
    name_encrypted BLOB COMMENT '姓名(加密)',
    phone_encrypted BLOB COMMENT '手机号(加密)',
    id_card_encrypted BLOB COMMENT '身份证号(加密)',
    bank_card_encrypted BLOB COMMENT '银行卡号(加密)',
    birth_date_encrypted BLOB COMMENT '出生日期(加密)',
    
    -- 组织信息
    department_id CHAR(36) COMMENT '部门ID',
    position VARCHAR(100) COMMENT '职位',
    employment_type VARCHAR(20) DEFAULT 'full_time' COMMENT '用工类型: full_time-全职, part_time-兼职, intern-实习, contract-合同',
    
    -- 工作信息
    entry_date DATE COMMENT '入职日期',
    probation_end_date DATE COMMENT '试用期结束日期',
    leave_date DATE COMMENT '离职日期',
    status VARCHAR(20) DEFAULT 'pending' COMMENT '状态: pending-待完善, active-在职, inactive-离职',
    
    -- 钉钉集成
    dingtalk_user_id VARCHAR(100) COMMENT '钉钉用户ID',
    
    -- 身份证复印件存储路径
    id_card_front_s3_path VARCHAR(500) COMMENT '身份证正面S3路径',
    id_card_back_s3_path VARCHAR(500) COMMENT '身份证反面S3路径',
    
    -- 其他信息
    gender VARCHAR(10) COMMENT '性别: male-男, female-女',
    address TEXT COMMENT '家庭住址',
    emergency_contact VARCHAR(50) COMMENT '紧急联系人',
    emergency_phone VARCHAR(20) COMMENT '紧急联系电话',
    
    -- 数据完整性标记
    data_complete BOOLEAN DEFAULT FALSE COMMENT '数据是否完整',
    
    -- 审计字段
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    created_by VARCHAR(50) COMMENT '创建人',
    updated_by VARCHAR(50) COMMENT '更新人',
    
    -- 外键约束
    FOREIGN KEY (department_id) REFERENCES departments(department_id) ON DELETE SET NULL,
    
    -- 索引
    INDEX idx_employee_number (employee_number),
    INDEX idx_department (department_id),
    INDEX idx_status (status),
    INDEX idx_entry_date (entry_date),
    INDEX idx_dingtalk_user (dingtalk_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='员工信息表';
