-- =============================================
-- 用户权限表
-- 表名: users
-- 说明: 系统用户账号和权限管理
-- =============================================

CREATE TABLE IF NOT EXISTS users (
    -- 主键
    user_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    
    -- 关联员工
    employee_id CHAR(36) UNIQUE COMMENT '关联员工ID',
    
    -- 账号信息
    username VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名',
    password_hash VARCHAR(255) NOT NULL COMMENT '密码哈希',
    
    -- 用户信息
    display_name VARCHAR(100) COMMENT '显示名称',
    email VARCHAR(100) COMMENT '邮箱',
    phone VARCHAR(20) COMMENT '手机号',
    
    -- 角色和权限
    role VARCHAR(50) DEFAULT 'employee' COMMENT '角色: admin-管理员, hr-HR, manager-经理, employee-员工',
    permissions JSON COMMENT '权限列表',
    
    -- 状态
    status VARCHAR(20) DEFAULT 'active' COMMENT '状态: active-启用, inactive-停用, locked-锁定',
    is_active BOOLEAN DEFAULT TRUE COMMENT '是否激活',
    
    -- 登录安全
    login_attempts INT DEFAULT 0 COMMENT '登录尝试次数',
    last_login_at TIMESTAMP COMMENT '最后登录时间',
    last_login_ip VARCHAR(50) COMMENT '最后登录IP',
    locked_until TIMESTAMP COMMENT '锁定到期时间',
    
    -- 密码策略
    password_changed_at TIMESTAMP COMMENT '密码最后修改时间',
    password_expires_at TIMESTAMP COMMENT '密码过期时间',
    must_change_password BOOLEAN DEFAULT FALSE COMMENT '必须修改密码',
    
    -- Token管理
    refresh_token VARCHAR(500) COMMENT '刷新令牌',
    refresh_token_expires_at TIMESTAMP COMMENT '刷新令牌过期时间',
    
    -- 审计字段
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    created_by VARCHAR(50) COMMENT '创建人',
    
    -- 外键约束
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
    
    -- 索引
    INDEX idx_username (username),
    INDEX idx_employee_id (employee_id),
    INDEX idx_role (role),
    INDEX idx_status (status),
    INDEX idx_last_login (last_login_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户权限表';
