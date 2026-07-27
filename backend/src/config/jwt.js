/**
 * JWT 配置（含生产环境密钥校验）
 *
 * 安全要求：生产环境必须显式配置强 JWT_SECRET，否则拒绝启动，
 * 避免使用可预测的默认密钥导致 token 被伪造。开发/测试环境允许
 * 使用不安全的回退密钥（仅为本地便利），并打印告警。
 */

require('dotenv').config();

// 历史代码中散落的可预测默认值，视为"未配置"
const INSECURE_DEFAULT = 'your_super_secure_jwt_secret_here';
const DEV_FALLBACK = 'dev_only_insecure_jwt_secret_change_me';

const isProduction = process.env.NODE_ENV === 'production';
let { JWT_SECRET } = process.env;

if (!JWT_SECRET || JWT_SECRET === INSECURE_DEFAULT) {
  if (isProduction) {
    throw new Error(
      'JWT_SECRET must be set to a strong, unique value in production. '
        + 'Refusing to start with a missing or default secret.'
    );
  }
  JWT_SECRET = DEV_FALLBACK;
  // eslint-disable-next-line no-console
  console.warn(
    '[security] JWT_SECRET 未配置，正在使用不安全的开发回退密钥。部署前请务必设置 JWT_SECRET。'
  );
}

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

module.exports = { JWT_SECRET, JWT_EXPIRES_IN };
