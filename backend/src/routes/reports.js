/**
 * Report Routes
 *
 * 报表相关的API路由
 */

const express = require('express');

const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticateToken } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permission');

/**
 * GET /api/reports/leaves
 * 获取假期报表
 * 权限: reports.view_all 或 reports.view_department
 */
router.get(
  '/leaves',
  authenticateToken,
  checkPermission('reports.view_all'),
  reportController.getLeaveReport
);

/**
 * GET /api/reports/attendance
 * 获取考勤报表
 * 权限: reports.view_all 或 reports.view_department
 */
router.get(
  '/attendance',
  authenticateToken,
  checkPermission('reports.view_all'),
  reportController.getAttendanceReport
);

/**
 * GET /api/reports/onboarding-offboarding
 * 获取入职/离职人员报表
 * 权限: reports.view_all 或 reports.view_department
 */
router.get(
  '/onboarding-offboarding',
  authenticateToken,
  checkPermission('reports.view_all'),
  reportController.getOnboardingOffboardingReport
);

module.exports = router;
