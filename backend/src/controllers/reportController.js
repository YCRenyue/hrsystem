/**
 * Report Controller
 *
 * 处理报表相关的HTTP请求
 */

const reportService = require('../services/ReportService');
const logger = require('../utils/logger');

/**
 * 获取假期报表
 *
 * @param {Object} req - Express request对象
 * @param {Object} res - Express response对象
 */
async function getLeaveReport(req, res) {
  try {
    const user = req.user; // 从认证中间件获取
    const filters = {
      start_date: req.query.start_date,
      end_date: req.query.end_date,
      leave_type: req.query.leave_type,
      department_id: req.query.department_id,
      employee_id: req.query.employee_id,
      status: req.query.status
    };

    logger.info('Generating leave report', {
      user_id: user.user_id,
      filters
    });

    const report = await reportService.getLeaveReport(user, filters);

    res.status(200).json({
      success: true,
      data: report,
      message: '假期报表生成成功'
    });
  } catch (error) {
    logger.error('获取假期报表失败:', error.message);
    res.status(500).json({
      success: false,
      message: '获取假期报表失败',
      error: error.message
    });
  }
}

/**
 * 获取考勤报表
 *
 * @param {Object} req - Express request对象
 * @param {Object} res - Express response对象
 */
async function getAttendanceReport(req, res) {
  try {
    const user = req.user;
    const filters = {
      start_date: req.query.start_date,
      end_date: req.query.end_date,
      department_id: req.query.department_id,
      employee_id: req.query.employee_id,
      status: req.query.status
    };

    logger.info('Generating attendance report', {
      user_id: user.user_id,
      filters
    });

    const report = await reportService.getAttendanceReport(user, filters);

    res.status(200).json({
      success: true,
      data: report,
      message: '考勤报表生成成功'
    });
  } catch (error) {
    logger.error('获取考勤报表失败:', error.message);
    res.status(500).json({
      success: false,
      message: '获取考勤报表失败',
      error: error.message
    });
  }
}

/**
 * 获取入职/离职人员报表
 *
 * @param {Object} req - Express request对象
 * @param {Object} res - Express response对象
 */
async function getOnboardingOffboardingReport(req, res) {
  try {
    const user = req.user;
    const filters = {
      start_date: req.query.start_date,
      end_date: req.query.end_date,
      department_id: req.query.department_id,
      report_type: req.query.report_type || 'both',
      departure_date: req.query.departure_date === 'true'
    };

    logger.info('Generating onboarding/offboarding report', {
      user_id: user.user_id,
      filters
    });

    const report = await reportService.getOnboardingOffboardingReport(user, filters);

    res.status(200).json({
      success: true,
      data: report,
      message: '入离职报表生成成功'
    });
  } catch (error) {
    logger.error('获取入离职报表失败:', error.message);
    res.status(500).json({
      success: false,
      message: '获取入离职报表失败',
      error: error.message
    });
  }
}

module.exports = {
  getLeaveReport,
  getAttendanceReport,
  getOnboardingOffboardingReport
};
