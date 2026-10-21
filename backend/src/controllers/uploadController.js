/**
 * Upload Controller
 * Handles file upload to OSS and signed URL generation
 */
const {
  Employee, OnboardingProcess, BusinessTrip, Reimbursement
} = require('../models');
const { ossService } = require('../services/OSSService');
const { NotFoundError, ValidationError, ForbiddenError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

// Valid file types for upload
const VALID_FILE_TYPES = [
  'id_card_front', 'id_card_back', 'bank_card', 'diploma',
  'policy_ack', 'training_pledge', 'employment_contract'
];

// Map file type to database column
const FILE_TYPE_TO_COLUMN = {
  id_card_front: 'id_card_front_oss_key',
  id_card_back: 'id_card_back_oss_key',
  bank_card: 'bank_card_oss_key',
  diploma: 'diploma_oss_key',
  policy_ack: 'policy_ack_file_key',
  training_pledge: 'training_pledge_file_key',
  employment_contract: 'employment_contract_file_key'
};

// Roles allowed to access any employee's personal documents (ID card, bank
// card, diploma, signed policy/pledge/contract files)
const EMPLOYEE_FILE_ROLES = ['admin', 'hr_admin'];
// Roles allowed to view any business trip / reimbursement attachment
const VIEW_ALL_ROLES = ['admin', 'hr_admin', 'department_manager'];

/**
 * Verify the caller may act on the given employee's files: must be the
 * employee themselves, or HR/admin. Used as defense-in-depth on top of route
 * auth so one authenticated user cannot read/overwrite/delete another
 * employee's documents by passing an arbitrary :employeeId.
 * @param {Object} req Express request (req.user from JWT)
 * @param {string} employeeId
 * @throws {ForbiddenError} if the caller is not permitted
 */
const assertEmployeeFileAccess = (req, employeeId) => {
  const isOwner = req.user?.employee_id === employeeId;
  if (!isOwner && !EMPLOYEE_FILE_ROLES.includes(req.user?.role)) {
    throw new ForbiddenError('无权访问该员工的文件');
  }
};

/**
 * Parse an OSS object key to determine which resource it belongs to, so
 * GET /api/upload/signed-url can be checked for ownership instead of handing
 * out a signed URL for any key a caller happens to pass in.
 * @param {string} key OSS object key
 * @returns {{ type: 'employee'|'businesstrip'|'reimbursement'|'unknown', id: string|null }}
 */
const resolveOssKeyOwner = (key) => {
  let match = key.match(/^(?:idcard|misc)\/([^/]+)\//);
  if (match) return { type: 'employee', id: match[1] };

  match = key.match(/^(?:bankcard|diploma)\/([^_/]+)_/);
  if (match) return { type: 'employee', id: match[1] };

  match = key.match(/^businesstrip\/([^/]+)\//);
  if (match) return { type: 'businesstrip', id: match[1] };

  match = key.match(/^reimbursement\/([^/]+)\//);
  if (match) return { type: 'reimbursement', id: match[1] };

  return { type: 'unknown', id: null };
};

/**
 * Verify the caller may obtain a signed URL for the given OSS object key.
 * Fails closed: unrecognized key formats are only accessible to HR/admin.
 * @param {Object} req Express request
 * @param {string} key OSS object key
 * @throws {ForbiddenError} if the caller is not permitted
 */
const assertSignedUrlAccess = async (req, key) => {
  const { type, id } = resolveOssKeyOwner(key);
  const role = req.user?.role;

  if (type === 'employee') {
    if (req.user?.employee_id === id || EMPLOYEE_FILE_ROLES.includes(role)) return;
    throw new ForbiddenError('无权访问该文件');
  }

  if (type === 'businesstrip') {
    if (VIEW_ALL_ROLES.includes(role)) return;
    const trip = await BusinessTrip.findByPk(id);
    if (trip && req.user?.employee_id && trip.employee_id === req.user.employee_id) return;
    throw new ForbiddenError('无权访问该文件');
  }

  if (type === 'reimbursement') {
    if (VIEW_ALL_ROLES.includes(role)) return;
    const reimbursement = await Reimbursement.findByPk(id);
    if (reimbursement && req.user?.employee_id && reimbursement.employee_id === req.user.employee_id) return;
    throw new ForbiddenError('无权访问该文件');
  }

  // Unknown key format: fail closed, only HR/admin may access
  if (EMPLOYEE_FILE_ROLES.includes(role)) return;
  throw new ForbiddenError('无权访问该文件');
};

/**
 * Upload employee document file
 * POST /api/upload/employee/:employeeId/file
 */
const uploadEmployeeFile = async (req, res) => {
  const { employeeId } = req.params;
  const { fileType } = req.body;

  assertEmployeeFileAccess(req, employeeId);

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

  assertEmployeeFileAccess(req, employeeId);

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
        diploma_url: null,
        policy_ack_url: null,
        training_pledge_url: null,
        employment_contract_url: null
      }
    });
  }

  // Generate signed URLs for all existing files in parallel
  const entries = await Promise.all(VALID_FILE_TYPES.map(async (fileType) => {
    const objectKey = employee[FILE_TYPE_TO_COLUMN[fileType]];
    if (!objectKey) return [`${fileType}_url`, null];
    const result = await ossService.getSignedUrl(objectKey);
    return [`${fileType}_url`, result.success ? result.url : null];
  }));

  return res.json({
    success: true,
    data: Object.fromEntries(entries)
  });
};

/**
 * Delete employee document
 * DELETE /api/upload/employee/:employeeId/file/:fileType
 */
const deleteEmployeeFile = async (req, res) => {
  const { employeeId, fileType } = req.params;

  assertEmployeeFileAccess(req, employeeId);

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

  return res.json({
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

  await assertSignedUrlAccess(req, key);

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
