-- =============================================
-- 操作日志表
-- 表名: audit_logs
-- 说明: 记录系统所有重要操作的审计日志
-- =============================================

CREATE TABLE IF NOT EXISTS audit_logs (
    -- 主键
    log_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    
    -- 操作用户
    user_id VARCHAR(50) NOT NULL COMMENT '操作用户ID',
    user_name VARCHAR(100) COMMENT '操作用户名',
    user_role VARCHAR(50) COMMENT '用户角色',
    
    -- 操作信息
    action VARCHAR(100) NOT NULL COMMENT '操作类型: CREATE-创建, UPDATE-更新, DELETE-删除, READ-读取, LOGIN-登录, LOGOUT-登出',
    action_description TEXT COMMENT '操作描述',
    
    -- 资源信息
    resource_type VARCHAR(50) COMMENT '资源类型: employee-员工, department-部门, document-文档等',
    resource_id VARCHAR(100) COMMENT '资源ID',
    resource_name VARCHAR(200) COMMENT '资源名称',
    
    -- 变更内容
    old_value JSON COMMENT '变更前的值',
    new_value JSON COMMENT '变更后的值',
    changed_fields JSON COMMENT '变更的字段列表',
    
    -- 请求信息
    ip_address VARCHAR(50) COMMENT '操作IP地址',
    user_agent TEXT COMMENT '用户代理',
    request_method VARCHAR(10) COMMENT '请求方法: GET, POST, PUT, DELETE等',
    request_url VARCHAR(500) COMMENT '请求URL',
    request_params JSON COMMENT '请求参数',
    
    -- 响应信息
    response_status INT COMMENT '响应状态码',
    response_message TEXT COMMENT '响应消息',
    execution_time INT COMMENT '执行时间(毫秒)',
    
    -- 操作结果
    status VARCHAR(20) DEFAULT 'success' COMMENT '操作状态: success-成功, failed-失败, error-错误',
    error_message TEXT COMMENT '错误信息',
    
    -- 安全等级
    security_level VARCHAR(20) DEFAULT 'normal' COMMENT '安全等级: low-低, normal-正常, high-高, critical-关键',
    
    -- 会话信息
    session_id VARCHAR(100) COMMENT '会话ID',
    
    -- 地理位置（可选）
    location VARCHAR(200) COMMENT '地理位置',
    
    -- 审计字段
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    
    -- 索引
    INDEX idx_user_id (user_id),
    INDEX idx_action (action),
    INDEX idx_resource (resource_type, resource_id),
    INDEX idx_created_at (created_at),
    INDEX idx_ip_address (ip_address),
    INDEX idx_status (status),
    INDEX idx_security_level (security_level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='操作日志表';

-- 创建分区（按月分区，优化查询性能）
-- ALTER TABLE audit_logs PARTITION BY RANGE (YEAR(created_at) * 100 + MONTH(created_at)) (
--     PARTITION p202501 VALUES LESS THAN (202502),
--     PARTITION p202502 VALUES LESS THAN (202503),
--     -- 根据需要添加更多分区
--     PARTITION pmax VALUES LESS THAN MAXVALUE
-- );
