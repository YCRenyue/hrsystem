-- =============================================
-- 年假管理表
-- 表名: annual_leaves
-- 说明: 管理员工年假额度和使用情况
-- =============================================

CREATE TABLE IF NOT EXISTS annual_leaves (
    -- 主键
    leave_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    
    -- 关联员工
    employee_id CHAR(36) NOT NULL COMMENT '员工ID',
    
    -- 年份
    year INT NOT NULL COMMENT '年度',
    
    -- 假期额度
    total_days DECIMAL(4,1) DEFAULT 0 COMMENT '总天数',
    used_days DECIMAL(4,1) DEFAULT 0 COMMENT '已使用天数',
    remaining_days DECIMAL(4,1) DEFAULT 0 COMMENT '剩余天数',
    
    -- 假期类型明细
    annual_leave_days DECIMAL(4,1) DEFAULT 0 COMMENT '年假天数',
    sick_leave_days DECIMAL(4,1) DEFAULT 0 COMMENT '病假天数',
    personal_leave_days DECIMAL(4,1) DEFAULT 0 COMMENT '事假天数',
    maternity_leave_days DECIMAL(4,1) DEFAULT 0 COMMENT '产假天数',
    paternity_leave_days DECIMAL(4,1) DEFAULT 0 COMMENT '陪产假天数',
    marriage_leave_days DECIMAL(4,1) DEFAULT 0 COMMENT '婚假天数',
    bereavement_leave_days DECIMAL(4,1) DEFAULT 0 COMMENT '丧假天数',
    
    -- 调休额度
    compensatory_days DECIMAL(4,1) DEFAULT 0 COMMENT '调休总天数',
    compensatory_used_days DECIMAL(4,1) DEFAULT 0 COMMENT '已使用调休天数',
    
    -- 计算规则
    entry_date DATE COMMENT '入职日期',
    working_years INT DEFAULT 0 COMMENT '工龄(年)',
    calculation_rule TEXT COMMENT '计算规则说明',
    
    -- 状态
    status VARCHAR(20) DEFAULT 'active' COMMENT '状态: active-生效, expired-过期',
    
    -- 审计字段
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    
    -- 外键约束
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
    
    -- 索引
    INDEX idx_employee_year (employee_id, year),
    INDEX idx_year (year),
    INDEX idx_status (status),
    
    -- 唯一约束（每个员工每年只能有一条记录）
    UNIQUE KEY uk_employee_year (employee_id, year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='年假管理表';
