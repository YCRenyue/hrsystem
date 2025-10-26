-- =============================================
-- 就餐记录表
-- 表名: meal_records
-- 说明: 记录员工每日就餐情况
-- =============================================

CREATE TABLE IF NOT EXISTS meal_records (
    -- 主键
    record_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    
    -- 关联员工
    employee_id CHAR(36) NOT NULL COMMENT '员工ID',
    
    -- 就餐日期
    meal_date DATE NOT NULL COMMENT '就餐日期',
    
    -- 餐次类型
    meal_type VARCHAR(20) NOT NULL COMMENT '餐次类型: breakfast-早餐, lunch-午餐, dinner-晚餐, snack-加餐',
    
    -- 就餐地点
    canteen_location VARCHAR(100) COMMENT '食堂位置',
    
    -- 金额信息
    original_amount DECIMAL(10,2) COMMENT '原价金额',
    subsidy_amount DECIMAL(10,2) DEFAULT 0 COMMENT '补贴金额',
    actual_amount DECIMAL(10,2) COMMENT '实付金额',
    
    -- 支付方式
    payment_method VARCHAR(20) COMMENT '支付方式: card-饭卡, mobile-手机支付, cash-现金',
    payment_reference VARCHAR(100) COMMENT '支付凭证号',
    
    -- 菜品信息
    dishes JSON COMMENT '菜品列表',
    
    -- 营养信息（可选）
    calories INT COMMENT '卡路里',
    nutrition_info JSON COMMENT '营养成分信息',
    
    -- 评价
    rating INT COMMENT '评分(1-5)',
    feedback TEXT COMMENT '反馈意见',
    
    -- 数据来源
    source VARCHAR(20) DEFAULT 'system' COMMENT '数据来源: system-系统录入, manual-手动录入, imported-导入',
    
    -- 审计字段
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    
    -- 外键约束
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
    
    -- 索引
    INDEX idx_employee_date (employee_id, meal_date),
    INDEX idx_meal_date (meal_date),
    INDEX idx_meal_type (meal_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='就餐记录表';
