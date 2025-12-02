# 报表系统文档

## 概述

报表系统提供多维度的HR数据统计和可视化功能，支持基于权限的数据访问控制。系统包含三大核心报表：假期报表、考勤报表、入离职报表。

## 功能特性

### 1. 假期报表 (Leave Report)

**功能说明**：
- 统计员工请假记录，支持多种假期类型
- 提供按类型、部门的分组统计
- 可视化展示假期使用情况

**支持的假期类型**：
- `annual` - 年假
- `sick` - 病假
- `personal` - 事假
- `compensatory` - 调休
- `maternity` - 产假
- `paternity` - 陪产假
- `marriage` - 婚假
- `bereavement` - 丧假
- `other` - 其他

**统计指标**：
- 总请假次数
- 总请假天数
- 平均请假天数
- 按类型分组统计（次数、天数）
- 按部门分组统计（次数、天数）

**筛选条件**：
- 日期范围（开始日期、结束日期）
- 假期类型
- 部门（仅管理员/HR可见）
- 员工ID
- 状态（pending/approved/rejected/cancelled）

### 2. 考勤报表 (Attendance Report)

**功能说明**：
- 统计员工出勤情况
- 追踪异常考勤记录（迟到、早退、缺勤）
- 计算工作时长和加班时长

**考勤状态**：
- `normal` - 正常
- `late` - 迟到
- `early_leave` - 早退
- `absent` - 缺勤
- `leave` - 请假
- `holiday` - 节假日
- `weekend` - 周末

**统计指标**：
- 总考勤记录数
- 正常出勤次数
- 迟到次数及累计分钟
- 早退次数及累计分钟
- 缺勤次数
- 总工作时长
- 总加班时长
- 按状态分组统计
- 按部门分组统计
- 异常考勤记录明细

**筛选条件**：
- 日期范围
- 部门（仅管理员/HR可见）
- 员工ID
- 考勤状态

### 3. 入离职报表 (Onboarding/Offboarding Report)

**功能说明**：
- 统计入职和离职员工数据
- 分析人员流动趋势
- 按部门和月份分组统计

**报表类型**：
- `onboarding` - 仅入职
- `offboarding` - 仅离职
- `both` - 入职+离职

**统计指标**：
- 入职人数及明细
- 离职人数及明细
- 按部门分组统计
- 按月份趋势分析
- 入离职对比趋势图

**筛选条件**：
- 日期范围
- 部门（仅管理员/HR可见）
- 报表类型

## 权限控制

报表系统实现三级权限数据访问控制：

### 数据范围 (Data Scope)

1. **全局 (all)**
   - 角色：Admin、HR Manager
   - 权限：查看所有部门的数据
   - 可选择特定部门进行筛选

2. **部门 (department)**
   - 角色：Department Manager
   - 权限：仅查看本部门数据
   - 部门筛选器不可见

3. **个人 (self)**
   - 角色：Employee
   - 权限：仅查看个人数据
   - 无法访问报表页面（权限不足）

### 权限要求

访问报表需要以下权限之一：
- `reports.view_all` - 查看所有报表
- `reports.view_department` - 查看部门报表

在前端路由配置中添加权限检查：
```typescript
{
  path: '/reports',
  component: Reports,
  meta: {
    requiresAuth: true,
    permissions: ['reports.view_all', 'reports.view_department']
  }
}
```

## API 接口

### 1. 获取假期报表

**端点**：`GET /api/reports/leaves`

**查询参数**：
```
start_date: string (YYYY-MM-DD)
end_date: string (YYYY-MM-DD)
leave_type: string (annual|sick|personal|...)
department_id: string (UUID)
employee_id: string (UUID)
status: string (pending|approved|rejected|cancelled)
```

**响应示例**：
```json
{
  "success": true,
  "data": {
    "leaves": [
      {
        "leave_id": "uuid",
        "employee": {
          "employee_id": "uuid",
          "employee_number": "EMP001",
          "name": "张三",
          "department": "技术部"
        },
        "leave_type": "annual",
        "start_date": "2025-01-01",
        "end_date": "2025-01-03",
        "days": 3,
        "reason": "年假",
        "status": "approved"
      }
    ],
    "statistics": {
      "total_leaves": 10,
      "total_days": 25.5,
      "avg_days": "2.6"
    },
    "byType": [
      {
        "type": "annual",
        "name": "年假",
        "count": 5,
        "total_days": 15
      }
    ],
    "byDepartment": [
      {
        "department_id": "uuid",
        "department_name": "技术部",
        "count": 8,
        "total_days": 20
      }
    ],
    "total": 10
  },
  "message": "假期报表生成成功"
}
```

### 2. 获取考勤报表

**端点**：`GET /api/reports/attendance`

**查询参数**：
```
start_date: string (YYYY-MM-DD)
end_date: string (YYYY-MM-DD)
department_id: string (UUID)
employee_id: string (UUID)
status: string (normal|late|early_leave|absent|...)
```

**响应示例**：
```json
{
  "success": true,
  "data": {
    "attendances": [...],
    "statistics": {
      "total": 100,
      "normal": 80,
      "late": 15,
      "early_leave": 3,
      "absent": 2,
      "total_late_minutes": 450,
      "total_early_leave_minutes": 90,
      "total_work_hours": 800,
      "total_overtime_hours": 50
    },
    "byStatus": [
      {
        "status": "normal",
        "name": "正常",
        "count": 80
      }
    ],
    "byDepartment": [...],
    "abnormalRecords": [...],
    "total": 100
  },
  "message": "考勤报表生成成功"
}
```

### 3. 获取入离职报表

**端点**：`GET /api/reports/onboarding-offboarding`

**查询参数**：
```
start_date: string (YYYY-MM-DD)
end_date: string (YYYY-MM-DD)
department_id: string (UUID)
report_type: string (onboarding|offboarding|both)
departure_date: boolean (true|false)
```

**响应示例**：
```json
{
  "success": true,
  "data": {
    "onboarding": {
      "employees": [...],
      "total": 10,
      "byDepartment": [...],
      "byMonth": [
        {
          "month": "2025-01",
          "count": 5
        }
      ]
    },
    "offboarding": {
      "employees": [...],
      "total": 3,
      "byDepartment": [...],
      "byMonth": [...]
    },
    "period": {
      "start_date": "2025-01-01",
      "end_date": "2025-01-31"
    }
  },
  "message": "入离职报表生成成功"
}
```

## 前端组件

### 组件结构

```
Reports/
├── index.tsx                           # 主报表页面（Tab容器）
├── LeaveReport.tsx                     # 假期报表
├── AttendanceReport.tsx                # 考勤报表
└── OnboardingOffboardingReport.tsx     # 入离职报表
```

### 使用示例

```typescript
import Reports from '@/pages/Reports';

// 在路由中使用
<Route path="/reports" element={<Reports />} />
```

### 可视化图表

使用 **@ant-design/plots** 库进行数据可视化：

1. **柱状图 (Column)**
   - 假期按类型统计
   - 假期按部门统计
   - 入职/离职按部门统计

2. **饼图 (Pie)**
   - 考勤状态分布

3. **折线图 (Line)**
   - 入离职趋势对比

安装依赖：
```bash
npm install @ant-design/plots
```

## 数据库模型

### Leave 模型

```javascript
{
  leave_id: STRING(36) PRIMARY KEY,
  employee_id: STRING(36) FOREIGN KEY,
  leave_type: ENUM,
  start_date: DATEONLY,
  end_date: DATEONLY,
  days: DECIMAL(4,1),
  reason: TEXT,
  status: ENUM,
  approver_id: STRING(36),
  approved_at: DATE,
  approval_notes: TEXT,
  attachment_url: STRING(500),
  created_at: DATE,
  updated_at: DATE
}
```

### Attendance 模型

```javascript
{
  attendance_id: STRING(36) PRIMARY KEY,
  employee_id: STRING(36) FOREIGN KEY,
  date: DATEONLY,
  check_in_time: TIME,
  check_out_time: TIME,
  status: ENUM,
  late_minutes: INTEGER,
  early_leave_minutes: INTEGER,
  work_hours: DECIMAL(4,2),
  overtime_hours: DECIMAL(4,2),
  notes: TEXT,
  created_at: DATE,
  updated_at: DATE
}
```

## 测试

### 运行测试

```bash
# 运行所有报表测试
cd backend && npx jest reportService.test.js reportController.test.js

# 运行单个测试文件
npx jest reportService.test.js

# 运行测试并查看覆盖率
npx jest --coverage reportService.test.js
```

### 测试覆盖

- **ReportService**: 100% 方法覆盖
  - `getLeaveReport()`
  - `getAttendanceReport()`
  - `getOnboardingOffboardingReport()`
  - `_applyDataScopeFilter()`
  - 统计和分组方法

- **ReportController**: 100% 端点覆盖
  - `GET /api/reports/leaves`
  - `GET /api/reports/attendance`
  - `GET /api/reports/onboarding-offboarding`
  - 错误处理场景

## 性能优化建议

### 1. 数据库索引

确保以下字段建立索引：
```sql
-- Leave表
CREATE INDEX idx_leaves_employee_id ON leaves(employee_id);
CREATE INDEX idx_leaves_date_range ON leaves(start_date, end_date);
CREATE INDEX idx_leaves_status ON leaves(status);

-- Attendance表
CREATE INDEX idx_attendance_employee_id ON attendances(employee_id);
CREATE INDEX idx_attendance_date ON attendances(date);
CREATE INDEX idx_attendance_status ON attendances(status);

-- Employee表
CREATE INDEX idx_employees_entry_date ON employees(entry_date);
CREATE INDEX idx_employees_departure_date ON employees(departure_date);
```

### 2. 查询优化

- 使用 `include` 预加载关联数据，避免N+1查询
- 对大数据集使用分页
- 限制日期范围（建议不超过1年）

### 3. 缓存策略

对于频繁访问的报表，可以实施缓存：
```javascript
const NodeCache = require('node-cache');
const reportCache = new NodeCache({ stdTTL: 600 }); // 10分钟缓存

// 在服务层使用缓存
const cacheKey = `leave_report_${userId}_${JSON.stringify(filters)}`;
const cached = reportCache.get(cacheKey);
if (cached) return cached;

// 生成报表...
reportCache.set(cacheKey, result);
```

## 导出功能

### Excel导出（待实现）

```javascript
// 前端
const handleExport = async () => {
  const response = await axios.get('/api/reports/leaves/export', {
    params: filters,
    responseType: 'blob'
  });

  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `leave_report_${Date.now()}.xlsx`);
  document.body.appendChild(link);
  link.click();
};

// 后端（使用xlsx库）
const XLSX = require('xlsx');

router.get('/leaves/export', async (req, res) => {
  const report = await reportService.getLeaveReport(req.user, req.query);

  const worksheet = XLSX.utils.json_to_sheet(report.leaves);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '假期报表');

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Disposition', 'attachment; filename=leave_report.xlsx');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buffer);
});
```

## 故障排除

### 常见问题

1. **权限不足**
   - 检查用户角色是否包含 `reports.view_all` 或 `reports.view_department` 权限
   - 验证 `data_scope` 设置是否正确

2. **数据为空**
   - 确认筛选条件是否过于严格
   - 检查数据库中是否有对应的记录
   - 验证日期范围是否合理

3. **性能慢**
   - 检查是否查询了过大的日期范围
   - 确认数据库索引是否正确建立
   - 考虑添加分页或缓存

4. **图表不显示**
   - 确认 `@ant-design/plots` 已正确安装
   - 检查数据格式是否符合图表要求
   - 查看浏览器控制台是否有错误

## 未来扩展

1. **定时报表推送**
   - 每周/每月自动生成报表
   - 通过邮件或钉钉发送给管理人员

2. **自定义报表**
   - 允许用户配置报表字段
   - 保存常用筛选条件

3. **更多图表类型**
   - 热力图：展示考勤分布
   - 雷达图：部门对比分析
   - 散点图：员工表现分析

4. **数据对比**
   - 同比/环比分析
   - 多部门横向对比

## 相关文档

- [API文档](./api.md)
- [数据库设计](./database.md)
- [权限系统](./RBAC.md)
- [前端开发指南](./frontend.md)
