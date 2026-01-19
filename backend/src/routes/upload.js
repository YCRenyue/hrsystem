/**
 * File Upload Routes
 * Handles OSS file upload for employee documents
 */
const express = require('express');
const multer = require('multer');

const router = express.Router();
const uploadController = require('../controllers/uploadController');
const { authenticateToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp'
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed'));
    }
  }
});

/**
 * @route   POST /api/upload/employee/:employeeId/file
 * @desc    Upload employee document (ID card, bank card, diploma)
 * @access  Private
 */
router.post(
  '/employee/:employeeId/file',
  authenticateToken,
  upload.single('file'),
  asyncHandler(uploadController.uploadEmployeeFile)
);

/**
 * @route   POST /api/upload/onboarding/:token/file
 * @desc    Upload file during onboarding process (public with token)
 * @access  Public (token-based)
 */
router.post(
  '/onboarding/:token/file',
  upload.single('file'),
  asyncHandler(uploadController.uploadOnboardingFile)
);

/**
 * @route   GET /api/upload/employee/:employeeId/signed-urls
 * @desc    Get signed URLs for employee documents
 * @access  Private
 */
router.get(
  '/employee/:employeeId/signed-urls',
  authenticateToken,
  asyncHandler(uploadController.getEmployeeFileUrls)
);

/**
 * @route   DELETE /api/upload/employee/:employeeId/file/:fileType
 * @desc    Delete employee document
 * @access  Private
 */
router.delete(
  '/employee/:employeeId/file/:fileType',
  authenticateToken,
  asyncHandler(uploadController.deleteEmployeeFile)
);

module.exports = router;
