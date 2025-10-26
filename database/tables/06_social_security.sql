-- =============================================
-- 社保公积金表
-- 表名: social_security
-- 说明: 记录员工每月社保公积金缴纳情况
-- =============================================

CREATE TABLE IF NOT EXISTS social_security (
    -- 主键
    record_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    
    -- 关联员工
    employee_id CHAR(36) NOT NULL COMMENT '员工ID',
    
    -- 月份
    `year_month` CHAR(8) NOT NULL COMMENT '年月(YYYY-MM)',
    
    -- 缴纳基数
    base_amount DECIMAL(10,2) COMMENT '缴纳基数',
    
    -- 养老保险
    pension_company DECIMAL(10,2) DEFAULT 0 COMMENT '养老保险-公司部分',
    pension_personal DECIMAL(10,2) DEFAULT 0 COMMENT '养老保险-个人部分',
    pension_rate_company DECIMAL(5,2) COMMENT '养老保险-公司比例(%)',
    pension_rate_personal DECIMAL(5,2) COMMENT '养老保险-个人比例(%)',
    
    -- 医疗保险
    medical_company DECIMAL(10,2) DEFAULT 0 COMMENT '医疗保险-公司部分',
    medical_personal DECIMAL(10,2) DEFAULT 0 COMMENT '医疗保险-个人部分',
    medical_rate_company DECIMAL(5,2) COMMENT '医疗保险-公司比例(%)',
    medical_rate_personal DECIMAL(5,2) COMMENT '医疗保险-个人比例(%)',
    
    -- 失业保险
    unemployment_company DECIMAL(10,2) DEFAULT 0 COMMENT '失业保险-公司部分',
    unemployment_personal DECIMAL(10,2) DEFAULT 0 COMMENT '失业保险-个人部分',
    unemployment_rate_company DECIMAL(5,2) COMMENT '失业保险-公司比例(%)',
    unemployment_rate_personal DECIMAL(5,2) COMMENT '失业保险-个人比例(%)',
    
    -- 工伤保险（仅公司缴纳）
    injury_company DECIMAL(10,2) DEFAULT 0 COMMENT '工伤保险-公司部分',
    injury_rate_company DECIMAL(5,2) COMMENT '工伤保险-公司比例(%)',
    
    -- 生育保险（仅公司缴纳）
    maternity_company DECIMAL(10,2) DEFAULT 0 COMMENT '生育保险-公司部分',
    maternity_rate_company DECIMAL(5,2) COMMENT '生育保险-公司比例(%)',
    
    -- 住房公积金
    housing_fund_company DECIMAL(10,2) DEFAULT 0 COMMENT '住房公积金-公司部分',
    housing_fund_personal DECIMAL(10,2) DEFAULT 0 COMMENT '住房公积金-个人部分',
    housing_fund_rate_company DECIMAL(5,2) COMMENT '住房公积金-公司比例(%)',
    housing_fund_rate_personal DECIMAL(5,2) COMMENT '住房公积金-个人比例(%)',
    
    -- 合计
    total_company DECIMAL(10,2) DEFAULT 0 COMMENT '公司合计',
    total_personal DECIMAL(10,2) DEFAULT 0 COMMENT '个人合计',
    total_amount DECIMAL(10,2) DEFAULT 0 COMMENT '总计',
    
    -- 缴纳状态
    payment_status VARCHAR(20) DEFAULT 'pending' COMMENT '缴纳状态: pending-待缴纳, paid-已缴纳, delayed-延期',
    payment_date DATE COMMENT '缴纳日期',
    
    -- 备注
    notes TEXT COMMENT '备注',
    
    -- 审计字段
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    created_by VARCHAR(50) COMMENT '创建人',
    
    -- 外键约束
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
    
    -- 索引
    INDEX idx_employee_month (employee_id, `year_month`),
    INDEX idx_year_month (`year_month`),
    INDEX idx_payment_status (payment_status),
    
    -- 唯一约束（每个员工每月只能有一条记录）
    UNIQUE KEY uk_employee_month (employee_id, `year_month`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='社保公积金表';
