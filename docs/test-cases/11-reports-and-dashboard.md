# 系统概览与综合报表 测试用例

- 测试环境：http://47.103.206.98（部署 #76，提交 6c9fa9a）
- 测试账号：admin123（超级管理员）
- 测试日期：2026-10-21

## 用例汇总

| 编号 | 用例 | 结果 |
|------|------|------|
| DASH-01 | 系统概览初始状态 | 通过 |
| DASH-02 | 导入后统计更新 | 通过（本月出勤率为 0） |
| RPT-01 | 假期报表查询 | **失败：500** |
| RPT-02 | 考勤报表查询 | **失败：500** |
| RPT-03 | 入离职报表查询 | **失败：500** |

## DASH-01 系统概览初始状态

- 实际：员工总数 0、部门 15、待入职 0，其他指标为 0
- 结果：通过

![初始概览](screenshots/dashboard-overview.jpg)

## DASH-02 导入后统计更新

- 实际：员工总数 105、部门 20（含导入预览误建的 5 个空部门，见员工文档 EMP-13，已删除，现为 15 个）、待入职 1、本月请假 1；部门分布：生产部 50、销售部 17、财务部 6、未分配 1 等；状态统计：在职 105、待完善 1
- 结果：通过
- 观察：“本月出勤率 0%”，因为导入的考勤数据在 2026 年 3 月，不是本月，属于正常；“资料完成率 0%”，因为导入的员工都没有上传证件资料

## RPT-01 至 RPT-03 综合报表

- 步骤：打开“综合报表”，在假期、考勤、入离职三个页签分别点“查询”
- 预期：返回报表数据
- 实际：三个接口都返回 500，页面提示“获取假期报表失败”
  - `/api/reports/leaves`、`/api/reports/attendance`：`Unknown column 'employee.name' in 'field list'`
  - `/api/reports/onboarding-offboarding`：`Unknown column 'Employee.departure_date' in 'order clause'`
- 结果：**失败（整个综合报表模块不可用）**
- 原因：`backend/src/services/ReportService.js` 第 77、163 行查询员工的 `name` 列，但姓名是加密存储的，表里只有 `name_encrypted`；第 265 至 289 行使用 `departure_date`，而员工表的离职日期字段是 `leave_date`
- 附带问题：500 响应把数据库错误原文返回给了前端，暴露了表结构。生产环境应只返回通用错误
- 优先级：高

![报表报错](screenshots/report-01-leave-report-error.jpg)
