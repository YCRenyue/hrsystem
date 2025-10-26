-- =============================================
-- 入职流程表
-- 表名: onboarding_processes
-- 说明: 管理员工入职流程和状态
-- =============================================

CREATE TABLE IF NOT EXISTS onboarding_processes (
    -- 主键
    process_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    
    -- 关联员工
    employee_id CHAR(36) NOT NULL COMMENT '员工ID',
    
    -- 流程状态
    status VARCHAR(20) DEFAULT 'pending' COMMENT '状态: pending-待发送, sent-已发送, completed-已完成, expired-已过期',
    
    -- 表单信息
    form_token VARCHAR(100) UNIQUE COMMENT '表单访问令牌',
    form_link VARCHAR(500) COMMENT '表单访问链接',
    token_expires_at TIMESTAMP COMMENT '令牌过期时间',
    
    -- 推送信息
    push_channel VARCHAR(20) COMMENT '推送渠道: dingtalk-钉钉, sms-短信, email-邮件, manual-手动',
    push_time TIMESTAMP COMMENT '推送时间',
    push_status VARCHAR(20) COMMENT '推送状态: success-成功, failed-失败',
    push_error TEXT COMMENT '推送错误信息',
    
    -- 完成信息
    completed_at TIMESTAMP COMMENT '完成时间',
    submitted_data JSON COMMENT '提交的数据',
    
    -- 审计字段
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    created_by VARCHAR(50) COMMENT '创建人',
    
    -- 外键约束
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
    
    -- 索引
    INDEX idx_employee_id (employee_id),
    INDEX idx_status (status),
    INDEX idx_form_token (form_token),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='入职流程表';
