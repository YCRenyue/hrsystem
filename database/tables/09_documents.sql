-- =============================================
-- 文档管理表
-- 表名: documents
-- 说明: 存储员工相关文档的S3路径和元数据
-- =============================================

CREATE TABLE IF NOT EXISTS documents (
    -- 主键
    document_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    
    -- 关联员工
    employee_id CHAR(36) NOT NULL COMMENT '员工ID',
    
    -- 文档类型
    document_type VARCHAR(50) NOT NULL COMMENT '文档类型: id_card-身份证, contract-合同, diploma-学历证明, certificate-资格证书, photo-照片, other-其他',
    document_category VARCHAR(50) COMMENT '文档分类',
    
    -- 文件信息
    file_name VARCHAR(255) NOT NULL COMMENT '文件名',
    original_name VARCHAR(255) COMMENT '原始文件名',
    file_extension VARCHAR(10) COMMENT '文件扩展名',
    file_size BIGINT COMMENT '文件大小(字节)',
    mime_type VARCHAR(100) COMMENT 'MIME类型',
    
    -- S3存储信息
    s3_bucket VARCHAR(100) COMMENT 'S3桶名',
    s3_key VARCHAR(500) NOT NULL COMMENT 'S3对象键',
    s3_region VARCHAR(50) COMMENT 'S3区域',
    s3_version_id VARCHAR(100) COMMENT 'S3版本ID',
    s3_etag VARCHAR(100) COMMENT 'S3 ETag',
    
    -- 安全信息
    is_encrypted BOOLEAN DEFAULT TRUE COMMENT '是否加密存储',
    encryption_algorithm VARCHAR(50) COMMENT '加密算法',
    access_level VARCHAR(20) DEFAULT 'private' COMMENT '访问级别: private-私有, internal-内部, public-公开',
    
    -- OCR识别信息（如果适用）
    ocr_data JSON COMMENT 'OCR识别结果',
    ocr_status VARCHAR(20) COMMENT 'OCR状态: pending-待处理, processing-处理中, completed-已完成, failed-失败',
    
    -- 文档状态
    status VARCHAR(20) DEFAULT 'active' COMMENT '状态: active-有效, archived-已归档, deleted-已删除',
    expiry_date DATE COMMENT '过期日期',
    
    -- 审核信息
    verified BOOLEAN DEFAULT FALSE COMMENT '是否已验证',
    verified_by VARCHAR(50) COMMENT '验证人',
    verified_at TIMESTAMP COMMENT '验证时间',
    
    -- 版本控制
    version INT DEFAULT 1 COMMENT '版本号',
    previous_version_id CHAR(36) COMMENT '上一版本ID',
    
    -- 描述和标签
    description TEXT COMMENT '文档描述',
    tags JSON COMMENT '标签',
    
    -- 审计字段
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '上传时间',
    uploaded_by VARCHAR(50) COMMENT '上传人',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    updated_by VARCHAR(50) COMMENT '更新人',
    
    -- 外键约束
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
    FOREIGN KEY (previous_version_id) REFERENCES documents(document_id) ON DELETE SET NULL,
    
    -- 索引
    INDEX idx_employee_id (employee_id),
    INDEX idx_document_type (document_type),
    INDEX idx_status (status),
    INDEX idx_s3_key (s3_key),
    INDEX idx_uploaded_at (uploaded_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文档管理表';
