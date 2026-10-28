/**
 * Notification Service
 *
 * Centralized service for sending notifications through multiple channels:
 * - DingTalk work notifications (primary)
 * - Email notifications (fallback/alternative)
 * - SMS notifications (future implementation)
 *
 * Implements fallback strategy: DingTalk -> Email -> Manual
 */

const nodemailer = require('nodemailer');
const dingTalkService = require('./DingTalkService');
const logger = require('../utils/logger');

class NotificationService {
  constructor() {
    // Email transporter configuration
    this.emailTransporter = null;
    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
      this.emailTransporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
    } else {
      logger.warn('Email configuration not found. Email notifications will be disabled.');
    }
  }

  /**
   * Send notification with automatic fallback
   *
   * @param {Object} options - Notification options
   * @param {Object} options.employee - Employee object with dingtalk_user_id, email, phone
   * @param {string} options.title - Notification title
   * @param {string} options.content - Notification content (text/markdown)
   * @param {string} options.type - Notification type ('text', 'markdown', 'link', 'oa')
   * @param {Object} options.extra - Extra data for specific message types
   * @param {boolean} options.emailFallback - Enable email fallback if DingTalk fails
   * @returns {Promise<Object>} Result with channel and success status
   */
  async sendNotification(options) {
    const {
      employee, title, content, type = 'text', extra = {}, emailFallback = true
    } = options;

    const result = {
      success: false,
      channel: null,
      error: null
    };

    // Try DingTalk first if user has dingtalk_user_id
    if (employee.dingtalk_user_id && dingTalkService.isEnabled()) {
      try {
        await this._sendViaDingTalk(employee.dingtalk_user_id, title, content, type, extra);
        result.success = true;
        result.channel = 'dingtalk';
        logger.info(`Notification sent via DingTalk to ${employee.name}`);
        return result;
      } catch (error) {
        logger.error(`DingTalk notification failed for ${employee.name}:`, error.message);
        result.error = error.message;
      }
    }

    // Fallback to email if DingTalk failed or not available
    if (emailFallback && employee.email && this.emailTransporter) {
      try {
        await this._sendViaEmail(employee.email, title, content, extra);
        result.success = true;
        result.channel = 'email';
        logger.info(`Notification sent via Email to ${employee.name}`);
        return result;
      } catch (error) {
        logger.error(`Email notification failed for ${employee.name}:`, error.message);
        result.error = error.message;
      }
    }

    // All channels failed
    if (!result.success) {
      logger.error(`All notification channels failed for ${employee.name}`);
      result.error = result.error || 'No available notification channels';
    }

    return result;
  }

  /**
   * Send via DingTalk
   *
   * @private
   */
  async _sendViaDingTalk(userId, title, content, type, extra) {
    switch (type) {
    case 'text':
      return dingTalkService.sendTextMessage([userId], content);

    case 'markdown':
      return dingTalkService.sendMarkdownMessage([userId], title, content);

    case 'link':
      return dingTalkService.sendLinkMessage([userId], {
        title,
        text: content,
        messageUrl: extra.url || '',
        picUrl: extra.picUrl || ''
      });

    case 'oa':
      return dingTalkService.sendOAMessage([userId], {
        head: extra.head || { bgcolor: 'FFBBBBBB', text: title },
        body: extra.body || { title, content },
        ...extra
      });

    default:
      return dingTalkService.sendTextMessage([userId], content);
    }
  }

  /**
   * Send via Email
   *
   * @private
   */
  async _sendViaEmail(email, title, content, extra) {
    if (!this.emailTransporter) {
      throw new Error('Email transporter not configured');
    }

    const htmlContent = this._formatEmailContent(content, extra);

    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: title,
      text: content,
      html: htmlContent
    };

    const info = await this.emailTransporter.sendMail(mailOptions);
    return info;
  }

  /**
   * Format email content as HTML
   *
   * @private
   */
  _formatEmailContent(content, extra = {}) {
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 5px; }
          .footer { margin-top: 20px; font-size: 12px; color: #666; }
          .button { display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 3px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="content">
            ${content.replace(/\n/g, '<br>')}
          </div>
    `;

    if (extra.url) {
      html += `
          <div style="margin-top: 20px; text-align: center;">
            <a href="${extra.url}" class="button">点击查看详情</a>
          </div>
      `;
    }

    html += `
          <div class="footer">
            <p>此邮件由 HR 管理系统自动发送，请勿回复。</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return html;
  }

  /**
   * Batch send notifications to multiple employees
   *
   * @param {Array<Object>} employees - Array of employee objects
   * @param {string} title - Notification title
   * @param {string} content - Notification content
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Summary of results
   */
  async sendBatchNotification(employees, title, content, options = {}) {
    const results = {
      total: employees.length,
      success: 0,
      failed: 0,
      channels: { dingtalk: 0, email: 0 },
      errors: []
    };

    const promises = employees.map(async (employee) => {
      try {
        const result = await this.sendNotification({
          employee,
          title,
          content,
          ...options
        });

        if (result.success) {
          results.success += 1;
          results.channels[result.channel] += 1;
        } else {
          results.failed += 1;
          results.errors.push({
            employeeId: employee.employee_id,
            name: employee.name,
            error: result.error
          });
        }
      } catch (error) {
        results.failed += 1;
        results.errors.push({
          employeeId: employee.employee_id,
          name: employee.name,
          error: error.message
        });
      }
    });

    await Promise.all(promises);

    logger.info(`Batch notification completed: ${results.success}/${results.total} successful`);
    return results;
  }

  /**
   * Send onboarding notification (入职登记表推送)
   *
   * @param {Object} employee - Employee object
   * @param {string} formUrl - URL to the onboarding form
   * @returns {Promise<Object>} Result
   */
  async sendOnboardingNotification(employee, formUrl) {
    const title = '入职登记表填写通知';
    const content = `您好 ${employee.name}，

欢迎加入我们！请在入职日期前完成以下信息的填写：

请点击下方链接填写完整的入职登记表。如有任何问题，请联系 HR 部门。

期待您的加入！`;

    return this.sendNotification({
      employee,
      title,
      content,
      type: 'link',
      extra: {
        url: formUrl,
        picUrl: '' // Optional: Add company logo
      }
    });
  }

  /**
   * Send pre-onboarding reminder (入职前提醒)
   *
   * @param {Object} employee - Employee object
   * @param {number} daysUntilStart - Days until entry date
   * @returns {Promise<Object>} Result
   */
  async sendPreOnboardingReminder(employee, daysUntilStart) {
    const title = '入职前提醒';
    const content = `您好 ${employee.name}，

距离您的入职日期还有 ${daysUntilStart} 天（入职日期：${employee.entry_date}）。

请准备好以下材料：
- 身份证原件及复印件
- 学历证明
- 银行卡信息
- 一寸照片

如有任何疑问，请及时联系 HR 部门。

期待您的到来！`;

    return this.sendNotification({
      employee,
      title,
      content,
      type: 'markdown'
    });
  }

  /**
   * Send welcome message (入职一周后欢迎消息)
   *
   * @param {Object} employee - Employee object
   * @returns {Promise<Object>} Result
   */
  async sendWelcomeMessage(employee) {
    const title = '欢迎加入我们！';
    const content = `${employee.name}，您好！

恭喜您顺利完成第一周的工作！

希望您在这一周中适应了新的工作环境和团队氛围。如果在工作中遇到任何问题或困难，请随时与您的导师或 HR 联系。

我们期待您在团队中发挥更大的作用！

加油！💪`;

    return this.sendNotification({
      employee,
      title,
      content,
      type: 'text'
    });
  }

  /**
   * Send training reminder (新员工培训日程提醒)
   *
   * @param {Object} employee - Employee object
   * @param {Object} training - Training information
   * @returns {Promise<Object>} Result
   */
  async sendTrainingReminder(employee, training) {
    const title = '培训日程提醒';
    const content = `${employee.name}，您好！

您有一场培训即将开始：

**培训主题**：${training.subject}
**培训时间**：${training.datetime}
**培训地点**：${training.location}
**培训讲师**：${training.instructor}

请准时参加，如有特殊情况无法参加，请提前联系 HR 部门。`;

    return this.sendNotification({
      employee,
      title,
      content,
      type: 'markdown'
    });
  }

  /**
   * Send social security notification (社保缴纳情况推送)
   *
   * @param {Object} employee - Employee object
   * @param {Object} socialSecurity - Social security information
   * @returns {Promise<Object>} Result
   */
  async sendSocialSecurityNotification(employee, socialSecurity) {
    const title = '社保缴纳通知';
    const content = `${employee.name}，您好！

您本月的社保缴纳情况如下：

**缴纳月份**：${socialSecurity.month}
**个人缴纳**：¥${socialSecurity.personalAmount}
**公司缴纳**：¥${socialSecurity.companyAmount}
**缴纳状态**：${socialSecurity.status}

如有疑问，请联系 HR 部门。`;

    return this.sendNotification({
      employee,
      title,
      content,
      type: 'markdown'
    });
  }

  /**
   * Send contract expiration reminder (劳动合同到期提醒)
   *
   * @param {Object} employee - Employee object
   * @param {number} daysUntilExpiry - Days until contract expires
   * @returns {Promise<Object>} Result
   */
  async sendContractExpiryReminder(employee, daysUntilExpiry) {
    const title = '劳动合同到期提醒';
    const content = `${employee.name}，您好！

您的劳动合同将在 ${daysUntilExpiry} 天后到期。

**到期日期**：${employee.contract_expiry_date}

请及时与 HR 部门联系，办理续签手续。

感谢您的配合！`;

    return this.sendNotification({
      employee,
      title,
      content,
      type: 'markdown',
      emailFallback: true
    });
  }

  /**
   * Send monthly statistics (每月统计推送)
   *
   * @param {Object} employee - Employee object
   * @param {Object} statistics - Statistics data
   * @returns {Promise<Object>} Result
   */
  async sendMonthlyStatistics(employee, statistics) {
    const title = `${statistics.month} 月个人统计`;
    const content = `${employee.name}，您好！

您 ${statistics.month} 月的统计数据如下：

${statistics.travelAllowance ? `**出差补助**：¥${statistics.travelAllowance}` : ''}
${statistics.canteenExpense ? `**食堂工资**：¥${statistics.canteenExpense}` : ''}
${statistics.attendance ? `**出勤天数**：${statistics.attendance} 天` : ''}
${statistics.overtime ? `**加班时长**：${statistics.overtime} 小时` : ''}

详细信息请登录系统查看。`;

    return this.sendNotification({
      employee,
      title,
      content,
      type: 'markdown'
    });
  }

  /**
   * Check if notification service is available
   *
   * @returns {Object} Availability status for each channel
   */
  getAvailability() {
    return {
      dingtalk: dingTalkService.isEnabled(),
      email: !!this.emailTransporter
    };
  }
}

// Export singleton instance
module.exports = new NotificationService();
