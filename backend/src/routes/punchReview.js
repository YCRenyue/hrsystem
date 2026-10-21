/**
 * Punch Review Routes - 打卡对照表与异常打卡复核（仅 HR 与管理员）
 */
const express = require('express');

const router = express.Router();
const controller = require('../controllers/punchReviewController');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

router.use(authenticateToken);
router.use(requireRole('admin', 'hr_admin'));

/**
 * @route   GET /api/punch/mappings
 * @desc    查询打卡机工号对照表
 */
router.get('/mappings', asyncHandler(controller.listMappings));

/**
 * @route   POST /api/punch/mappings
 * @desc    新增/更新对照（device_type + external_id -> employee_id）
 */
router.post('/mappings', asyncHandler(controller.saveMapping));

/**
 * @route   DELETE /api/punch/mappings/:id
 * @desc    删除对照
 */
router.delete('/mappings/:id', asyncHandler(controller.deleteMapping));

/**
 * @route   GET /api/punch/anomalies
 * @desc    查询待复核异常打卡
 */
router.get('/anomalies', asyncHandler(controller.listAnomalies));

/**
 * @route   POST /api/punch/anomalies/resolve-batch
 * @desc    批量处理异常打卡（body: ids, resolution）
 */
router.post('/anomalies/resolve-batch', asyncHandler(controller.resolveAnomalies));

/**
 * @route   POST /api/punch/anomalies/:id/resolve
 * @desc    处理异常打卡（lunch / dinner / ignore）
 */
router.post('/anomalies/:id/resolve', asyncHandler(controller.resolveAnomaly));

/**
 * @route   GET /api/punch/employee-options
 * @desc    员工下拉选项（建立对照时使用）
 */
router.get('/employee-options', asyncHandler(controller.listEmployeeOptions));

module.exports = router;
