/**
 * summarizeNotificationError 单元测试：只返回简短原因，不泄露原文
 */

const { summarizeNotificationError } = require('../../utils/notificationError');

describe('summarizeNotificationError', () => {
  test('识别常见的邮件和钉钉错误', () => {
    expect(summarizeNotificationError(new Error('Invalid login: 535 Error: authentication failed')))
      .toBe('邮箱账号或授权码错误');
    expect(summarizeNotificationError('connect ETIMEDOUT 10.0.0.5:465'))
      .toBe('无法连接邮件服务器');
    expect(summarizeNotificationError('Failed to get DingTalk access token: errcode 40001'))
      .toBe('钉钉通知发送失败，请检查钉钉配置和员工钉钉账号');
    expect(summarizeNotificationError('No available notification channels'))
      .toBe('员工没有可用的钉钉账号或邮箱');
  });

  test('无法识别时只返回通用提示', () => {
    const reason = summarizeNotificationError('Unknown column secret_field in table x');
    expect(reason).toBe('发送失败，请联系管理员查看服务器日志');
    expect(reason).not.toContain('secret_field');
  });
});
