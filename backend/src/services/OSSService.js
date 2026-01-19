/**
 * Aliyun OSS Service
 * Handles file upload to OSS and generates signed URLs for private bucket access
 */
const OSS = require('ali-oss');
const path = require('path');
const crypto = require('crypto');
const logger = require('../utils/logger');

// Allowed image mime types
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp'
];

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Signed URL expiration time: 15 minutes
const SIGNED_URL_EXPIRES = 15 * 60;

class OSSService {
  constructor() {
    this.client = null;
    this.initialized = false;
  }

  /**
   * Initialize OSS client
   */
  init() {
    if (this.initialized) return;

    const {
      OSS_REGION,
      ALICLOUD_ACCESS_KEY,
      ALICLOUD_SECRET_KEY,
      OSS_BUCKET,
      OSS_INTERNAL
    } = process.env;

    if (!OSS_REGION || !ALICLOUD_ACCESS_KEY || !ALICLOUD_SECRET_KEY || !OSS_BUCKET) {
      logger.warn('OSS configuration is incomplete. File upload will be disabled.');
      return;
    }

    // Use internal endpoint if running on ECS in the same region
    const useInternal = OSS_INTERNAL === 'true';
    const endpoint = useInternal
      ? `oss-${OSS_REGION}-internal.aliyuncs.com`
      : `oss-${OSS_REGION}.aliyuncs.com`;

    this.client = new OSS({
      region: `oss-${OSS_REGION}`,
      accessKeyId: ALICLOUD_ACCESS_KEY,
      accessKeySecret: ALICLOUD_SECRET_KEY,
      bucket: OSS_BUCKET,
      endpoint,
      secure: true
    });

    this.initialized = true;
    logger.info(`OSS Service initialized with bucket: ${OSS_BUCKET}, endpoint: ${endpoint}`);
  }

  /**
   * Check if OSS is properly configured
   * @returns {boolean}
   */
  isConfigured() {
    return this.initialized && this.client !== null;
  }

  /**
   * Generate object key based on file type and employee ID
   * @param {string} employeeId - Employee ID
   * @param {string} fileType - Type of file (id_card_front, id_card_back, bank_card, diploma)
   * @param {string} originalFilename - Original filename
   * @returns {string} Object key
   */
  generateObjectKey(employeeId, fileType, originalFilename) {
    const ext = path.extname(originalFilename).toLowerCase() || '.jpg';
    const timestamp = Date.now();
    const hash = crypto.createHash('md5')
      .update(`${employeeId}-${fileType}-${timestamp}`)
      .digest('hex')
      .substring(0, 8);

    switch (fileType) {
      case 'id_card_front':
        return `idcard/${employeeId}/front_${hash}${ext}`;
      case 'id_card_back':
        return `idcard/${employeeId}/back_${hash}${ext}`;
      case 'bank_card':
        return `bankcard/${employeeId}_${hash}${ext}`;
      case 'diploma':
        return `diploma/${employeeId}_${hash}${ext}`;
      default:
        return `misc/${employeeId}/${fileType}_${hash}${ext}`;
    }
  }

  /**
   * Validate file before upload
   * @param {Object} file - File object with buffer, mimetype, size
   * @returns {{ valid: boolean, error?: string }}
   */
  validateFile(file) {
    if (!file || !file.buffer) {
      return { valid: false, error: 'No file provided' };
    }

    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, error: `File size exceeds limit (${MAX_FILE_SIZE / 1024 / 1024}MB)` };
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return { valid: false, error: `Invalid file type. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}` };
    }

    return { valid: true };
  }

  /**
   * Upload file to OSS
   * @param {string} employeeId - Employee ID
   * @param {string} fileType - Type of file
   * @param {Object} file - File object from multer (with buffer, originalname, mimetype)
   * @returns {Promise<{ success: boolean, objectKey?: string, error?: string }>}
   */
  async uploadFile(employeeId, fileType, file) {
    if (!this.isConfigured()) {
      return { success: false, error: 'OSS service is not configured' };
    }

    const validation = this.validateFile(file);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const objectKey = this.generateObjectKey(employeeId, fileType, file.originalname);

    try {
      const result = await this.client.put(objectKey, file.buffer, {
        headers: {
          'Content-Type': file.mimetype,
          'x-oss-storage-class': 'Standard'
        }
      });

      logger.info(`File uploaded to OSS: ${objectKey}`, {
        employeeId,
        fileType,
        size: file.size
      });

      return {
        success: true,
        objectKey,
        etag: result.res?.headers?.etag
      };
    } catch (error) {
      logger.error('OSS upload error:', {
        error: error.message,
        employeeId,
        fileType
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete file from OSS
   * @param {string} objectKey - Object key to delete
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  async deleteFile(objectKey) {
    if (!this.isConfigured()) {
      return { success: false, error: 'OSS service is not configured' };
    }

    if (!objectKey) {
      return { success: true }; // Nothing to delete
    }

    try {
      await this.client.delete(objectKey);
      logger.info(`File deleted from OSS: ${objectKey}`);
      return { success: true };
    } catch (error) {
      logger.error('OSS delete error:', {
        error: error.message,
        objectKey
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate signed URL for private file access
   * @param {string} objectKey - Object key
   * @param {number} expires - Expiration time in seconds (default: 15 minutes)
   * @returns {Promise<{ success: boolean, url?: string, error?: string }>}
   */
  async getSignedUrl(objectKey, expires = SIGNED_URL_EXPIRES) {
    if (!this.isConfigured()) {
      return { success: false, error: 'OSS service is not configured' };
    }

    if (!objectKey) {
      return { success: false, error: 'Object key is required' };
    }

    try {
      const url = await this.client.signatureUrl(objectKey, {
        expires,
        method: 'GET'
      });

      return { success: true, url };
    } catch (error) {
      logger.error('OSS signed URL error:', {
        error: error.message,
        objectKey
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Get signed URLs for multiple files
   * @param {string[]} objectKeys - Array of object keys
   * @param {number} expires - Expiration time in seconds
   * @returns {Promise<Object>} Object with objectKey as key and signed URL as value
   */
  async getSignedUrls(objectKeys, expires = SIGNED_URL_EXPIRES) {
    const result = {};

    for (const key of objectKeys) {
      if (key) {
        const signedResult = await this.getSignedUrl(key, expires);
        if (signedResult.success) {
          result[key] = signedResult.url;
        }
      }
    }

    return result;
  }

  /**
   * Check if file exists in OSS
   * @param {string} objectKey - Object key
   * @returns {Promise<boolean>}
   */
  async fileExists(objectKey) {
    if (!this.isConfigured() || !objectKey) {
      return false;
    }

    try {
      await this.client.head(objectKey);
      return true;
    } catch (error) {
      if (error.code === 'NoSuchKey') {
        return false;
      }
      throw error;
    }
  }
}

// Singleton instance
const ossService = new OSSService();
ossService.init();

module.exports = { ossService, OSSService };
