-- =============================================
-- 部门信息表
-- 表名: departments
-- 说明: 存储组织架构和部门信息
-- =============================================

CREATE TABLE IF NOT EXISTS departments (
    -- 主键
    department_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    
    -- 基本信息
    name VARCHAR(100) NOT NULL COMMENT '部门名称',
    code VARCHAR(50) NOT NULL UNIQUE COMMENT '部门编码',
    
    -- 组织结构
    parent_id CHAR(36) COMMENT '上级部门ID',
    level INT DEFAULT 1 COMMENT '部门层级',
    path VARCHAR(500) COMMENT '部门路径',
    
    -- 负责人信息
    manager_id CHAR(36) COMMENT '部门负责人ID',
    
    -- 钉钉集成
    dingtalk_dept_id VARCHAR(100) COMMENT '钉钉部门ID',
    
    -- 状态信息
    status VARCHAR(20) DEFAULT 'active' COMMENT '状态: active-启用, inactive-停用',
    sort_order INT DEFAULT 0 COMMENT '排序',
    
    -- 其他信息
    description TEXT COMMENT '部门描述',
    
    -- 审计字段
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    created_by VARCHAR(50) COMMENT '创建人',
    
    -- 外键约束
    FOREIGN KEY (parent_id) REFERENCES departments(department_id) ON DELETE SET NULL,
    FOREIGN KEY (manager_id) REFERENCES employees(employee_id) ON DELETE SET NULL,
    
    -- 索引
    INDEX idx_parent_id (parent_id),
    INDEX idx_code (code),
    INDEX idx_status (status),
    INDEX idx_dingtalk_dept (dingtalk_dept_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='部门信息表';
