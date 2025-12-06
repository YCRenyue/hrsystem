/**
 * Social Security Routes
 */
const express = require('express');

const router = express.Router();
const multer = require('multer');
const socialSecurityController = require('../controllers/socialSecurityController');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

// Configure multer for file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed'));
    }
  }
});

router.use(authenticateToken);

router.get('/', asyncHandler(socialSecurityController.getSocialSecurities));

router.get(
  '/template',
  requireRole('admin', 'hr_admin'),
  asyncHandler(socialSecurityController.downloadTemplate)
);

router.get(
  '/export',
  requireRole('admin', 'hr_admin'),
  asyncHandler(socialSecurityController.exportToExcel)
);

router.post(
  '/import',
  requireRole('admin', 'hr_admin'),
  upload.single('file'),
  asyncHandler(socialSecurityController.importFromExcel)
);

router.get('/:id', asyncHandler(socialSecurityController.getSocialSecurityById));

router.post(
  '/',
  requireRole('admin', 'hr_admin'),
  asyncHandler(socialSecurityController.createSocialSecurity)
);

router.put(
  '/:id',
  requireRole('admin', 'hr_admin'),
  asyncHandler(socialSecurityController.updateSocialSecurity)
);

router.delete(
  '/:id',
  requireRole('admin'),
  asyncHandler(socialSecurityController.deleteSocialSecurity)
);

module.exports = router;
