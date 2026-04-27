/**
 * Notification Routes - 站内通知
 */

const express = require('express');

const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticateToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

router.use(authenticateToken);

router.get('/', asyncHandler(notificationController.listNotifications));
router.get('/unread-count', asyncHandler(notificationController.getUnreadCount));
router.post('/read-all', asyncHandler(notificationController.markAllRead));
router.post('/:id/read', asyncHandler(notificationController.markRead));

module.exports = router;
