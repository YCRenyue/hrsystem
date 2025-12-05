/**
 * Attendance Routes
 * 考勤相关的API路由
 */

const express = require('express');

const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { authenticateToken } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permission');

/**
 * GET /api/attendance
 * 获取考勤记录列表
 * 权限: employees.view_all, employees.view_department, employees.view_self
 */
router.get(
  '/',
  authenticateToken,
  attendanceController.getAttendanceList
);

/**
 * GET /api/attendance/export
 * 导出考勤记录
 * 权限: employees.export
 */
router.get(
  '/export',
  authenticateToken,
  checkPermission('employees.export'),
  attendanceController.exportAttendance
);

/**
 * GET /api/attendance/stats/:employeeId
 * 获取员工考勤统计
 * 权限: employees.view_all, employees.view_department, employees.view_self
 */
router.get(
  '/stats/:employeeId',
  authenticateToken,
  attendanceController.getAttendanceStats
);

/**
 * GET /api/attendance/:id
 * 获取单条考勤记录详情
 * 权限: employees.view_all, employees.view_department, employees.view_self
 */
router.get(
  '/:id',
  authenticateToken,
  attendanceController.getAttendanceById
);

module.exports = router;
