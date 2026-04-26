/**
 * Business Trip Routes
 *
 * 出差申请的 REST 端点。第一期范围：申请、审批、撤销、查询、工时统计。
 * 附件上传走通用 /api/upload 端点（OSS），表单仅保存 OSS object key 列表。
 */

const express = require('express');

const router = express.Router();
const businessTripController = require('../controllers/businessTripController');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

router.use(authenticateToken);

// 列表 / 查询（员工只能看到自己的，由 controller 控制）
router.get('/', asyncHandler(businessTripController.getBusinessTrips));

// 冲突检查（提交前预校验）
router.get(
  '/conflicts/check',
  asyncHandler(businessTripController.checkConflicts)
);

// 工时统计
router.get(
  '/stats/work-hours',
  asyncHandler(businessTripController.getWorkHoursStats)
);

// 单条详情
router.get('/:id', asyncHandler(businessTripController.getBusinessTripById));

// 创建：员工本人或管理者可代为创建
router.post('/', asyncHandler(businessTripController.createBusinessTrip));

// 编辑：仅 draft/pending/rejected 状态可改
router.put('/:id', asyncHandler(businessTripController.updateBusinessTrip));

// 提交（draft/rejected → pending）
router.post(
  '/:id/submit',
  asyncHandler(businessTripController.submitBusinessTrip)
);

// 审批（仅管理者）
router.post(
  '/:id/approve',
  requireRole('admin', 'hr_admin', 'department_manager'),
  asyncHandler(businessTripController.approveBusinessTrip)
);

// 撤销（员工本人或管理者）
router.post(
  '/:id/cancel',
  asyncHandler(businessTripController.cancelBusinessTrip)
);

// 水印打卡上传记录（已通过 /api/upload/business-trip/:id/file 拿到 object_key 后调用）
router.post(
  '/:id/watermark',
  asyncHandler(businessTripController.addWatermarkPhoto)
);

// 水印打卡审核（缺卡提示）
router.get(
  '/:id/watermark/audit',
  asyncHandler(businessTripController.getWatermarkAudit)
);

// 删除（仅管理者，且仅 draft/cancelled/rejected）
router.delete(
  '/:id',
  requireRole('admin', 'hr_admin', 'department_manager'),
  asyncHandler(businessTripController.deleteBusinessTrip)
);

module.exports = router;
