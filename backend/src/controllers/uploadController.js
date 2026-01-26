/**
 * Upload Controller
 * Handles file upload to OSS and signed URL generation
 */
const { Employee, OnboardingProcess } = require('../models');
const { ossService } = require('../services/OSSService');
const { NotFoundError, ValidationError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

// Valid file types for upload
const VALID_FILE_TYPES = ['id_card_front', 'id_card_back', 'bank_card', 'diploma'];

// Map file type to database column
const FILE_TYPE_TO_COLUMN = {
  id_card_front: 'id_card_front_oss_key',
  id_card_back: 'id_card_back_oss_key',
  bank_card: 'bank_card_oss_key',
  diploma: 'diploma_oss_key'
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

module.exports = {
  uploadEmployeeFile,
  uploadOnboardingFile,
  getEmployeeFileUrls,
  deleteEmployeeFile
};
