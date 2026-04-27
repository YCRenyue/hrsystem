/**
 * Upload Controller
 * Handles file upload to OSS and signed URL generation
 */
const { Employee, OnboardingProcess } = require('../models');
const { ossService } = require('../services/OSSService');
const { NotFoundError, ValidationError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

// Valid file types for upload
const VALID_FILE_TYPES = [
  'id_card_front', 'id_card_back', 'bank_card', 'diploma',
  'policy_ack', 'training_pledge'
];

// Map file type to database column
const FILE_TYPE_TO_COLUMN = {
  id_card_front: 'id_card_front_oss_key',
  id_card_back: 'id_card_back_oss_key',
  bank_card: 'bank_card_oss_key',
  diploma: 'diploma_oss_key',
  policy_ack: 'policy_ack_file_key',
  training_pledge: 'training_pledge_file_key'
};

/**
 * Upload employee document file
 * POST /api/upload/employee/:employeeId/file
 */
const uploadEmployeeFile = async (req, res) => {
  const { employeeId } = req.params;
  const { fileType } = req.body;

  if (!VALID_FILE_TYPES.includes(fileType)) {
    throw new ValidationError(`Invalid file type. Must be one of: ${VALID_FILE_TYPES.join(', ')}`);
  }

  if (!req.file) {
    throw new ValidationError('No file uploaded');
  }

  const employee = await Employee.findByPk(employeeId);
  if (!employee) {
    throw new NotFoundError('Employee', employeeId);
  }

  // Check if OSS is configured
  if (!ossService.isConfigured()) {
    throw new ValidationError('File upload service is not configured');
  }

  // Delete old file if exists
  const columnName = FILE_TYPE_TO_COLUMN[fileType];
  const oldKey = employee[columnName];
  if (oldKey) {
    await ossService.deleteFile(oldKey);
  }

  // Upload new file
  const result = await ossService.uploadFile(employeeId, fileType, req.file);

  if (!result.success) {
    throw new ValidationError(`Upload failed: ${result.error}`);
  }

  // Update employee record
  await employee.update({ [columnName]: result.objectKey });

  logger.info('Employee file uploaded', {
    employeeId,
    fileType,
    objectKey: result.objectKey
  });

  // Generate signed URL for immediate display
  const signedUrlResult = await ossService.getSignedUrl(result.objectKey);

  res.json({
    success: true,
    message: 'File uploaded successfully',
    data: {
      fileType,
      url: signedUrlResult.success ? signedUrlResult.url : null
    }
  });
};

/**
 * Upload file during onboarding process
 * POST /api/upload/onboarding/:token/file
 */
const uploadOnboardingFile = async (req, res) => {
  const { token } = req.params;
  const { fileType } = req.body;

  if (!VALID_FILE_TYPES.includes(fileType)) {
    throw new ValidationError(`Invalid file type. Must be one of: ${VALID_FILE_TYPES.join(', ')}`);
  }

  if (!req.file) {
    throw new ValidationError('No file uploaded');
  }

  // Find onboarding process by token
  const process = await OnboardingProcess.findOne({
    where: { form_token: token },
    include: [{ model: Employee, as: 'employee' }]
  });

  if (!process) {
    throw new NotFoundError('Onboarding process', token);
  }

  if (process.status === 'completed') {
    throw new ValidationError('Onboarding process is already completed');
  }

  if (process.isTokenExpired()) {
    throw new ValidationError('Onboarding token has expired');
  }

  const { employee } = process;
  if (!employee) {
    throw new NotFoundError('Employee', 'associated with this process');
  }

  // Check if OSS is configured
  if (!ossService.isConfigured()) {
    throw new ValidationError('File upload service is not configured');
  }

  // Delete old file if exists
  const columnName = FILE_TYPE_TO_COLUMN[fileType];
  const oldKey = employee[columnName];
  if (oldKey) {
    await ossService.deleteFile(oldKey);
  }

  // Upload new file
  const result = await ossService.uploadFile(employee.employee_id, fileType, req.file);

  if (!result.success) {
    throw new ValidationError(`Upload failed: ${result.error}`);
  }

  // Update employee record
  await employee.update({ [columnName]: result.objectKey });

  logger.info('Onboarding file uploaded', {
    employeeId: employee.employee_id,
    fileType,
    objectKey: result.objectKey
  });

  // Generate signed URL for immediate display
  const signedUrlResult = await ossService.getSignedUrl(result.objectKey);

  res.json({
    success: true,
    message: 'File uploaded successfully',
    data: {
      fileType,
      url: signedUrlResult.success ? signedUrlResult.url : null
    }
  });
};

/**
 * Get signed URLs for employee documents
 * GET /api/upload/employee/:employeeId/signed-urls
 */
const getEmployeeFileUrls = async (req, res) => {
  const { employeeId } = req.params;

  const employee = await Employee.findByPk(employeeId);
  if (!employee) {
    throw new NotFoundError('Employee', employeeId);
  }

  // Check if OSS is configured
  if (!ossService.isConfigured()) {
    return res.json({
      success: true,
      data: {
        id_card_front_url: null,
        id_card_back_url: null,
        bank_card_url: null,
        diploma_url: null
      }
    });
  }

  // Generate signed URLs for all existing files
  const urls = {};

  for (const fileType of VALID_FILE_TYPES) {
    const columnName = FILE_TYPE_TO_COLUMN[fileType];
    const objectKey = employee[columnName];

    if (objectKey) {
      const result = await ossService.getSignedUrl(objectKey);
      urls[`${fileType}_url`] = result.success ? result.url : null;
    } else {
      urls[`${fileType}_url`] = null;
    }
  }

  res.json({
    success: true,
    data: urls
  });
};

/**
 * Delete employee document
 * DELETE /api/upload/employee/:employeeId/file/:fileType
 */
const deleteEmployeeFile = async (req, res) => {
  const { employeeId, fileType } = req.params;

  if (!VALID_FILE_TYPES.includes(fileType)) {
    throw new ValidationError(`Invalid file type. Must be one of: ${VALID_FILE_TYPES.join(', ')}`);
  }

  const employee = await Employee.findByPk(employeeId);
  if (!employee) {
    throw new NotFoundError('Employee', employeeId);
  }

  const columnName = FILE_TYPE_TO_COLUMN[fileType];
  const objectKey = employee[columnName];

  if (!objectKey) {
    return res.json({
      success: true,
      message: 'No file to delete'
    });
  }

  // Delete from OSS
  if (ossService.isConfigured()) {
    const result = await ossService.deleteFile(objectKey);
    if (!result.success) {
      logger.warn('Failed to delete file from OSS', {
        objectKey,
        error: result.error
      });
    }
  }

  // Update employee record
  await employee.update({ [columnName]: null });

  logger.info('Employee file deleted', {
    employeeId,
    fileType,
    objectKey
  });

  res.json({
    success: true,
    message: 'File deleted successfully'
  });
};

/**
 * Upload business trip attachment (itinerary, invoice, watermark photo)
 * POST /api/upload/business-trip/:tripId/file
 * Body: file
 * Returns: { object_key, name, type, url }
 */
const uploadBusinessTripAttachment = async (req, res) => {
  const { tripId } = req.params;

  if (!req.file) throw new ValidationError('未选择文件');
  if (!ossService.isConfigured()) {
    throw new ValidationError('文件上传服务未配置');
  }

  const path = require('path');
  const crypto = require('crypto');
  const ext = path.extname(req.file.originalname).toLowerCase() || '.jpg';
  const hash = crypto.randomBytes(4).toString('hex');
  const objectKey = `businesstrip/${tripId}/${Date.now()}_${hash}${ext}`;

  // 直接走 OSS client，复用底层；附件支持图片
  const { ossService: oss } = require('../services/OSSService');
  if (!oss.client) {
    throw new ValidationError('文件上传服务未初始化');
  }

  const validation = oss.validateFile(req.file);
  if (!validation.valid) throw new ValidationError(validation.error);

  await oss.client.put(objectKey, req.file.buffer, {
    headers: {
      'Content-Type': req.file.mimetype,
      'x-oss-storage-class': 'Standard'
    }
  });

  const signed = await oss.getSignedUrl(objectKey);

  logger.info('Business trip attachment uploaded', {
    tripId,
    objectKey,
    size: req.file.size
  });

  return res.json({
    success: true,
    data: {
      object_key: objectKey,
      name: req.file.originalname,
      type: req.file.mimetype,
      uploaded_at: new Date().toISOString(),
      url: signed.success ? signed.url : null
    }
  });
};

/**
 * Upload reimbursement invoice (PDF / image)
 * POST /api/upload/reimbursement/:reimbursementId/invoice
 *  Note: 即使 reimbursementId 为 'draft'（创建前），也允许先上传得到 OSS key 再随明细一起提交
 */
const uploadReimbursementInvoice = async (req, res) => {
  const { reimbursementId } = req.params;
  if (!req.file) throw new ValidationError('未选择文件');
  if (!ossService.isConfigured()) throw new ValidationError('文件上传服务未配置');

  const path = require('path');
  const crypto = require('crypto');
  const { ossService: oss } = require('../services/OSSService');
  if (!oss.client) throw new ValidationError('文件上传服务未初始化');

  const validation = oss.validateFile(req.file);
  if (!validation.valid) throw new ValidationError(validation.error);

  const ext = path.extname(req.file.originalname).toLowerCase() || '.jpg';
  const hash = crypto.randomBytes(4).toString('hex');
  const objectKey = `reimbursement/${reimbursementId}/${Date.now()}_${hash}${ext}`;

  await oss.client.put(objectKey, req.file.buffer, {
    headers: {
      'Content-Type': req.file.mimetype,
      'x-oss-storage-class': 'Standard'
    }
  });

  const signed = await oss.getSignedUrl(objectKey);

  logger.info('Reimbursement invoice uploaded', {
    reimbursementId,
    objectKey,
    size: req.file.size
  });

  return res.json({
    success: true,
    data: {
      object_key: objectKey,
      name: req.file.originalname,
      type: req.file.mimetype,
      uploaded_at: new Date().toISOString(),
      url: signed.success ? signed.url : null
    }
  });
};

/**
 * Get signed URL for an arbitrary OSS object key (used by attachment preview)
 * GET /api/upload/signed-url?key=...
 */
const getSignedUrlForKey = async (req, res) => {
  const { key } = req.query;
  if (!key) throw new ValidationError('缺少 key 参数');
  if (!ossService.isConfigured()) {
    return res.json({ success: true, data: { url: null } });
  }
  const result = await ossService.getSignedUrl(key);
  return res.json({
    success: true,
    data: { url: result.success ? result.url : null }
  });
};

module.exports = {
  uploadEmployeeFile,
  uploadOnboardingFile,
  getEmployeeFileUrls,
  deleteEmployeeFile,
  uploadBusinessTripAttachment,
  uploadReimbursementInvoice,
  getSignedUrlForKey
};
