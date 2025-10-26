-- =============================================
-- 考勤记录表
-- 表名: attendance_records
-- 说明: 记录员工每日考勤打卡信息
-- =============================================

CREATE TABLE IF NOT EXISTS attendance_records (
    -- 主键
    record_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    
    -- 关联员工
    employee_id CHAR(36) NOT NULL COMMENT '员工ID',
    
    -- 考勤日期
    attendance_date DATE NOT NULL COMMENT '考勤日期',
    
    -- 打卡信息
    check_in_time TIMESTAMP COMMENT '上班打卡时间',
    check_in_location VARCHAR(200) COMMENT '上班打卡地点',
    check_in_source VARCHAR(20) COMMENT '上班打卡来源: dingtalk-钉钉, manual-手动',
    
    check_out_time TIMESTAMP COMMENT '下班打卡时间',
    check_out_location VARCHAR(200) COMMENT '下班打卡地点',
    check_out_source VARCHAR(20) COMMENT '下班打卡来源: dingtalk-钉钉, manual-手动',
    
    -- 工时统计
    work_hours DECIMAL(4,2) COMMENT '工作时长(小时)',
    overtime_hours DECIMAL(4,2) DEFAULT 0 COMMENT '加班时长(小时)',
    
    -- 考勤状态
    status VARCHAR(20) DEFAULT 'normal' COMMENT '状态: normal-正常, late-迟到, early-早退, absent-缺勤, leave-请假',
    late_minutes INT DEFAULT 0 COMMENT '迟到分钟数',
    early_minutes INT DEFAULT 0 COMMENT '早退分钟数',
    
    -- 异常说明
    exception_reason TEXT COMMENT '异常原因说明',
    approved_by VARCHAR(50) COMMENT '审批人',
    approved_at TIMESTAMP COMMENT '审批时间',
    
    -- 钉钉集成
    dingtalk_record_id VARCHAR(100) COMMENT '钉钉考勤记录ID',
    
    -- 审计字段
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    
    -- 外键约束
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
    
    -- 索引
    INDEX idx_employee_date (employee_id, attendance_date),
    INDEX idx_attendance_date (attendance_date),
    INDEX idx_status (status),
    
    -- 唯一约束（每个员工每天只能有一条记录）
    UNIQUE KEY uk_employee_date (employee_id, attendance_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='考勤记录表';
