/**
 * Reimbursement Routes - 出差报销单
 */

const express = require('express');

const router = express.Router();
const reimbursementController = require('../controllers/reimbursementController');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

router.use(authenticateToken);

router.get('/', asyncHandler(reimbursementController.list));
router.get('/limits', asyncHandler(reimbursementController.getLimits));
router.get('/:id', asyncHandler(reimbursementController.getById));

router.post('/', asyncHandler(reimbursementController.create));
router.put('/:id', asyncHandler(reimbursementController.update));

router.post('/:id/submit', asyncHandler(reimbursementController.submit));
router.post(
  '/:id/approve',
  requireRole('admin'),
  asyncHandler(reimbursementController.approve)
);
router.post(
  '/:id/pay',
  requireRole('admin'),
  asyncHandler(reimbursementController.markPaid)
);
router.post('/:id/cancel', asyncHandler(reimbursementController.cancel));

router.delete(
  '/:id',
  requireRole('admin'),
  asyncHandler(reimbursementController.remove)
);

module.exports = router;
