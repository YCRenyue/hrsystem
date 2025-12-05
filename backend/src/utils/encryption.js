const crypto = require('crypto');
require('dotenv').config();

/**
 * Encryption utility for sensitive data
 * Uses AES-256-GCM for encryption with authentication
 */
class EncryptionService {
  constructor() {
    // Get encryption key from environment variable
    const key = process.env.ENCRYPTION_KEY;

    if (!key) {
      throw new Error('ENCRYPTION_KEY must be set in environment variables');
    }

    if (key.length !== 32) {
      throw new Error('ENCRYPTION_KEY must be exactly 32 characters');
    }

    this.algorithm = 'aes-256-gcm';
    this.key = Buffer.from(key, 'utf8');
  }

  /**
   * Encrypt data using AES-256-GCM
   * @param {string} plaintext - Data to encrypt
   * @returns {string} Encrypted data in format: iv:authTag:encryptedData (hex encoded)
   */
  encrypt(plaintext) {
    if (!plaintext || typeof plaintext !== 'string') {
      throw new Error('Plaintext must be a non-empty string');
    }

    try {
      // Generate random initialization vector
      const iv = crypto.randomBytes(16);

      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

      // Encrypt the data
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Get authentication tag
      const authTag = cipher.getAuthTag();

      // Return format: iv:authTag:encryptedData
      return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt data encrypted with AES-256-GCM
   * @param {string} encryptedData - Encrypted data in format: iv:authTag:encryptedData
   * @returns {string} Decrypted plaintext
   */
  decrypt(encryptedData) {
    if (!encryptedData || typeof encryptedData !== 'string') {
      throw new Error('Encrypted data must be a non-empty string');
    }

    try {
      // Parse the encrypted data format
      const parts = encryptedData.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
      }

      const [ivHex, authTagHex, encrypted] = parts;

      // Convert hex strings back to buffers
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');

      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
      decipher.setAuthTag(authTag);

      // Decrypt the data
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Mask phone number for display purposes
   * @param {string} phone - Phone number to mask
   * @returns {string} Masked phone number (e.g., 138****5678)
   */
  maskPhone(phone) {
    if (!phone || typeof phone !== 'string') {
      return '';
    }

    if (phone.length === 11) {
      return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
    }

    return phone;
  }

  /**
   * Mask ID card number for display purposes
   * @param {string} idCard - ID card number to mask
   * @returns {string} Masked ID card (e.g., 110***********1234)
   */
  maskIdCard(idCard) {
    if (!idCard || typeof idCard !== 'string') {
      return '';
    }

    if (idCard.length === 18) {
      return idCard.replace(/^(\d{3})\d{11}(\d{4})$/, '$1***********$2');
    }

    return idCard;
  }

  /**
   * Mask bank card number for display purposes
   * @param {string} bankCard - Bank card number to mask
   * @returns {string} Masked bank card (e.g., **** **** **** 1234)
   */
  maskBankCard(bankCard) {
    if (!bankCard || typeof bankCard !== 'string') {
      return '';
    }

    // Remove spaces and dashes
    const cleaned = bankCard.replace(/[\s-]/g, '');

    if (cleaned.length >= 12) {
      const lastFour = cleaned.slice(-4);
      return `**** **** **** ${lastFour}`;
    }

    return bankCard;
  }

  /**
   * Create SHA-256 hash for searchable encrypted fields
   * @param {string} data - Data to hash
   * @returns {string} SHA-256 hash in hex format
   */
  hash(data) {
    if (!data || typeof data !== 'string') {
      throw new Error('Data must be a non-empty string');
    }

    return crypto
      .createHash('sha256')
      .update(data.toLowerCase())
      .digest('hex');
  }

  /**
   * Hash password using bcrypt (delegated to bcryptjs)
   * Note: This is kept separate as password hashing should use bcrypt, not encryption
   */
  async hashPassword(password) {
    const bcrypt = require('bcryptjs');
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * Verify password against hash
   */
  async verifyPassword(password, hash) {
    const bcrypt = require('bcryptjs');
    return await bcrypt.compare(password, hash);
  }
}

// Export singleton instance
const encryptionService = new EncryptionService();

module.exports = {
  encryptionService,
  EncryptionService
};
