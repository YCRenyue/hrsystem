/**
 * DingTalk API Service
 *
 * Handles all interactions with DingTalk (钉钉) API including:
 * - Access token management with caching
 * - Work notification sending
 * - User information retrieval
 */

const axios = require('axios');
const logger = require('../utils/logger');

// DingTalk API base URLs
const DINGTALK_API_BASE = 'https://oapi.dingtalk.com';
const DINGTALK_NEW_API_BASE = 'https://api.dingtalk.com';

class DingTalkService {
  constructor() {
    this.accessToken = null;
    this.tokenExpireTime = null;
    this.appKey = process.env.DINGTALK_APP_KEY;
    this.appSecret = process.env.DINGTALK_APP_SECRET;
    this.agentId = process.env.DINGTALK_AGENT_ID;

    if (!this.appKey || !this.appSecret) {
      logger.warn('DingTalk credentials not configured. Notification features will be disabled.');
    }
  }

  /**
   * Get access token with automatic refresh
   * Token is cached for 2 hours (7200 seconds) as per DingTalk API specs
   *
   * @returns {Promise<string>} Access token
   * @throws {Error} If failed to get access token
   */
  async getAccessToken() {
    // Return cached token if still valid (with 5 minute buffer)
    if (this.accessToken && this.tokenExpireTime && Date.now() < this.tokenExpireTime - 300000) {
      return this.accessToken;
    }

    try {
      const response = await axios.get(`${DINGTALK_API_BASE}/gettoken`, {
        params: {
          appkey: this.appKey,
          appsecret: this.appSecret
        }
      });

      if (response.data.errcode !== 0) {
        throw new Error(`DingTalk API error: ${response.data.errmsg}`);
      }

      this.accessToken = response.data.access_token;
      // Set expiration time (default 7200 seconds)
      this.tokenExpireTime = Date.now() + (response.data.expires_in || 7200) * 1000;

      logger.info('DingTalk access token obtained successfully');
      return this.accessToken;
    } catch (error) {
      logger.error('Failed to get DingTalk access token:', error.message);
      throw new Error(`Failed to get DingTalk access token: ${error.message}`);
    }
  }

  /**
   * Send work notification to specified users
   *
   * @param {Object} options - Notification options
   * @param {string[]} options.userIdList - Array of DingTalk user IDs
   * @param {string} options.msgType - Message type ('text', 'markdown', 'link', 'oa', 'action_card')
   * @param {Object} options.content - Message content (varies by msgType)
   * @returns {Promise<Object>} Result with task_id
   * @throws {Error} If sending fails
   */
  async sendWorkNotification(options) {
    const { userIdList, msgType = 'text', content } = options;

    if (!userIdList || userIdList.length === 0) {
      throw new Error('userIdList is required and cannot be empty');
    }

    const accessToken = await this.getAccessToken();

    try {
      const payload = {
        agent_id: this.agentId,
        userid_list: userIdList.join(','),
        msg: this._buildMessagePayload(msgType, content)
      };

      const response = await axios.post(
        `${DINGTALK_API_BASE}/topapi/message/corpconversation/asyncsend_v2`,
        payload,
        {
          params: { access_token: accessToken }
        }
      );

      if (response.data.errcode !== 0) {
        throw new Error(`DingTalk API error: ${response.data.errmsg}`);
      }

      logger.info(`Work notification sent successfully to ${userIdList.length} users`);
      return {
        success: true,
        taskId: response.data.task_id
      };
    } catch (error) {
      logger.error('Failed to send work notification:', error.message);
      throw new Error(`Failed to send work notification: ${error.message}`);
    }
  }

  /**
   * Send text message
   *
   * @param {string[]} userIdList - Array of DingTalk user IDs
   * @param {string} content - Text content
   * @returns {Promise<Object>} Result
   */
  async sendTextMessage(userIdList, content) {
    return this.sendWorkNotification({
      userIdList,
      msgType: 'text',
      content: { content }
    });
  }

  /**
   * Send markdown message
   *
   * @param {string[]} userIdList - Array of DingTalk user IDs
   * @param {string} title - Message title
   * @param {string} text - Markdown formatted text
   * @returns {Promise<Object>} Result
   */
  async sendMarkdownMessage(userIdList, title, text) {
    return this.sendWorkNotification({
      userIdList,
      msgType: 'markdown',
      content: { title, text }
    });
  }

  /**
   * Send link message
   *
   * @param {string[]} userIdList - Array of DingTalk user IDs
   * @param {Object} linkData - Link message data
   * @param {string} linkData.title - Link title
   * @param {string} linkData.text - Link description
   * @param {string} linkData.messageUrl - URL to navigate when clicked
   * @param {string} linkData.picUrl - Picture URL (optional)
   * @returns {Promise<Object>} Result
   */
  async sendLinkMessage(userIdList, linkData) {
    return this.sendWorkNotification({
      userIdList,
      msgType: 'link',
      content: linkData
    });
  }

  /**
   * Send OA message (suitable for approval processes)
   *
   * @param {string[]} userIdList - Array of DingTalk user IDs
   * @param {Object} oaData - OA message data
   * @returns {Promise<Object>} Result
   */
  async sendOAMessage(userIdList, oaData) {
    return this.sendWorkNotification({
      userIdList,
      msgType: 'oa',
      content: oaData
    });
  }

  /**
   * Build message payload based on message type
   *
   * @private
   * @param {string} msgType - Message type
   * @param {Object} content - Message content
   * @returns {Object} Formatted message payload
   */
  _buildMessagePayload(msgType, content) {
    const msgTypeMap = {
      text: {
        msgtype: 'text',
        text: { content: content.content }
      },
      markdown: {
        msgtype: 'markdown',
        markdown: {
          title: content.title,
          text: content.text
        }
      },
      link: {
        msgtype: 'link',
        link: {
          title: content.title,
          text: content.text,
          messageUrl: content.messageUrl,
          picUrl: content.picUrl || ''
        }
      },
      oa: {
        msgtype: 'oa',
        oa: content
      },
      action_card: {
        msgtype: 'action_card',
        action_card: content
      }
    };

    return msgTypeMap[msgType] || msgTypeMap.text;
  }

  /**
   * Get user information by user ID
   *
   * @param {string} userId - DingTalk user ID
   * @returns {Promise<Object>} User information
   * @throws {Error} If retrieval fails
   */
  async getUserInfo(userId) {
    const accessToken = await this.getAccessToken();

    try {
      const response = await axios.post(
        `${DINGTALK_API_BASE}/topapi/v2/user/get`,
        { userid: userId },
        { params: { access_token: accessToken } }
      );

      if (response.data.errcode !== 0) {
        throw new Error(`DingTalk API error: ${response.data.errmsg}`);
      }

      return response.data.result;
    } catch (error) {
      logger.error(`Failed to get user info for ${userId}:`, error.message);
      throw new Error(`Failed to get user info: ${error.message}`);
    }
  }

  /**
   * Get user ID by mobile phone number
   *
   * @param {string} mobile - Mobile phone number
   * @returns {Promise<string|null>} User ID or null if not found
   */
  async getUserIdByMobile(mobile) {
    const accessToken = await this.getAccessToken();

    try {
      const response = await axios.post(
        `${DINGTALK_API_BASE}/topapi/v2/user/getbymobile`,
        { mobile },
        { params: { access_token: accessToken } }
      );

      if (response.data.errcode !== 0) {
        if (response.data.errcode === 60121) {
          // User not found
          return null;
        }
        throw new Error(`DingTalk API error: ${response.data.errmsg}`);
      }

      return response.data.result.userid;
    } catch (error) {
      logger.error(`Failed to get user ID by mobile ${mobile}:`, error.message);
      return null;
    }
  }

  /**
   * Exchange authorization code for access token (OAuth flow)
   *
   * @param {string} authCode - Authorization code from DingTalk
   * @returns {Promise<Object>} Token information
   * @throws {Error} If exchange fails
   */
  async exchangeCodeForToken(authCode) {
    if (!authCode) {
      throw new Error('Authorization code is required');
    }

    try {
      const response = await axios.post(
        `${DINGTALK_NEW_API_BASE}/v1.0/oauth2/userAccessToken`,
        {
          clientId: this.appKey,
          clientSecret: this.appSecret,
          code: authCode,
          grantType: 'authorization_code'
        }
      );

      if (!response.data || !response.data.accessToken) {
        throw new Error('Invalid response from DingTalk OAuth API');
      }

      logger.info('Successfully exchanged code for DingTalk access token');
      return {
        accessToken: response.data.accessToken,
        expireIn: response.data.expireIn,
        refreshToken: response.data.refreshToken
      };
    } catch (error) {
      logger.error('Failed to exchange code for token:', error.message);
      throw new Error(`Failed to exchange code for token: ${error.message}`);
    }
  }

  /**
   * Get user info using OAuth access token
   *
   * @param {string} accessToken - User access token
   * @returns {Promise<Object>} User information
   * @throws {Error} If retrieval fails
   */
  async getUserInfoByToken(accessToken) {
    if (!accessToken) {
      throw new Error('Access token is required');
    }

    try {
      const response = await axios.get(
        `${DINGTALK_NEW_API_BASE}/v1.0/contact/users/me`,
        {
          headers: {
            'x-acs-dingtalk-access-token': accessToken
          }
        }
      );

      if (!response.data) {
        throw new Error('Invalid response from DingTalk user info API');
      }

      logger.info('Successfully retrieved user info from DingTalk');
      return response.data;
    } catch (error) {
      logger.error('Failed to get user info:', error.message);
      throw new Error(`Failed to get user info: ${error.message}`);
    }
  }

  /**
   * Check if DingTalk integration is enabled
   *
   * @returns {boolean} True if enabled
   */
  isEnabled() {
    return !!(this.appKey && this.appSecret && this.agentId);
  }
}

// Export singleton instance
module.exports = new DingTalkService();
