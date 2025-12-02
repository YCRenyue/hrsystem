/**
 * Report Routes
 *
 * 报表相关的API路由
 */

const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

/**
 * GET /api/reports/leaves
 * 获取假期报表
 * 权限: reports.view_all 或 reports.view_department
 */
router.get(
  '/leaves',
  authenticate,
  authorize(['reports.view_all', 'reports.view_department']),
  reportController.getLeaveReport
);

/**
 * GET /api/reports/attendance
 * 获取考勤报表
 * 权限: reports.view_all 或 reports.view_department
 */
router.get(
  '/attendance',
  authenticate,
  authorize(['reports.view_all', 'reports.view_department']),
  reportController.getAttendanceReport
);

/**
 * GET /api/reports/onboarding-offboarding
 * 获取入职/离职人员报表
 * 权限: reports.view_all 或 reports.view_department
 */
router.get(
  '/onboarding-offboarding',
  authenticate,
  authorize(['reports.view_all', 'reports.view_department']),
  reportController.getOnboardingOffboardingReport
);

module.exports = router;
