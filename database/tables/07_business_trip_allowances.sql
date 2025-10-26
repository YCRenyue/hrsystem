-- =============================================
-- 出差补助表
-- 表名: business_trip_allowances
-- 说明: 记录员工出差补助申请和发放情况
-- =============================================

CREATE TABLE IF NOT EXISTS business_trip_allowances (
    -- 主键
    allowance_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    
    -- 关联员工
    employee_id CHAR(36) NOT NULL COMMENT '员工ID',
    
    -- 出差信息
    trip_number VARCHAR(50) UNIQUE COMMENT '出差单号',
    destination VARCHAR(200) NOT NULL COMMENT '出差目的地',
    purpose TEXT COMMENT '出差事由',
    
    -- 时间信息
    start_date DATE NOT NULL COMMENT '出差开始日期',
    end_date DATE NOT NULL COMMENT '出差结束日期',
    days DECIMAL(3,1) COMMENT '出差天数',
    
    -- 补助标准
    daily_allowance DECIMAL(10,2) COMMENT '日补助标准',
    accommodation_allowance DECIMAL(10,2) DEFAULT 0 COMMENT '住宿补助',
    transportation_allowance DECIMAL(10,2) DEFAULT 0 COMMENT '交通补助',
    meal_allowance DECIMAL(10,2) DEFAULT 0 COMMENT '餐饮补助',
    other_allowance DECIMAL(10,2) DEFAULT 0 COMMENT '其他补助',
    
    -- 金额计算
    total_amount DECIMAL(10,2) COMMENT '补助总额',
    actual_amount DECIMAL(10,2) COMMENT '实际发放金额',
    
    -- 票据信息
    receipts_uploaded BOOLEAN DEFAULT FALSE COMMENT '是否已上传票据',
    receipt_s3_paths JSON COMMENT '票据文件S3路径列表',
    
    -- 审批流程
    status VARCHAR(20) DEFAULT 'draft' COMMENT '状态: draft-草稿, pending-待审批, approved-已批准, rejected-已拒绝, paid-已支付',
    submitted_at TIMESTAMP COMMENT '提交时间',
    approved_by VARCHAR(50) COMMENT '审批人',
    approved_at TIMESTAMP COMMENT '审批时间',
    rejection_reason TEXT COMMENT '拒绝原因',
    
    -- 支付信息
    payment_date DATE COMMENT '支付日期',
    payment_method VARCHAR(20) COMMENT '支付方式: bank_transfer-银行转账, cash-现金',
    payment_reference VARCHAR(100) COMMENT '支付凭证号',
    
    -- 备注
    notes TEXT COMMENT '备注',
    
    -- 审计字段
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    created_by VARCHAR(50) COMMENT '创建人',
    
    -- 外键约束
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
    
    -- 索引
    INDEX idx_employee_id (employee_id),
    INDEX idx_trip_number (trip_number),
    INDEX idx_status (status),
    INDEX idx_start_date (start_date),
    INDEX idx_payment_date (payment_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='出差补助表';
