/**
 * Notification error summary
 *
 * 通知发送失败时，原始错误可能包含服务器地址、账号等内部信息，不能原样返回前端。
 * 这里从原文中识别关键词，转成简短的中文原因；识别不了的只返回通用提示，原文只写日志。
 */

const RULES = [
  {
    keywords: ['EAUTH', 'Invalid login', '535', 'authentication'],
    reason: '邮箱账号或授权码错误'
  },
  {
    keywords: ['ECONNECTION', 'ECONNREFUSED', 'ETIMEDOUT', 'ESOCKET', 'ENOTFOUND', 'timeout'],
    reason: '无法连接邮件服务器'
  },
  {
    keywords: ['EENVELOPE', 'recipient', '550', 'No recipients'],
    reason: '收件人邮箱地址无效'
  },
  {
    keywords: ['transporter not configured'],
    reason: '邮件服务未配置'
  },
  {
    keywords: ['DingTalk', 'access token', 'userIdList'],
    reason: '钉钉通知发送失败，请检查钉钉配置和员工钉钉账号'
  },
  {
    keywords: ['No available notification channels'],
    reason: '员工没有可用的钉钉账号或邮箱'
  }
];

const DEFAULT_REASON = '发送失败，请联系管理员查看服务器日志';

/**
 * 把通知发送的原始错误转成简短中文原因
 *
 * @param {string|Error|null|undefined} rawError - 原始错误
 * @returns {string} 简短原因
 */
const summarizeNotificationError = (rawError) => {
  const text = rawError instanceof Error ? rawError.message : String(rawError || '');
  const lower = text.toLowerCase();
  const rule = RULES.find((r) => r.keywords.some((k) => lower.includes(k.toLowerCase())));
  return rule ? rule.reason : DEFAULT_REASON;
};

module.exports = { summarizeNotificationError };
