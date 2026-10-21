/**
 * Rate limiting middleware
 *
 * - apiLimiter: 所有 /api/ 接口的整体上限，按 IP 计数。公司员工通常共用一个出口 IP，
 *   所以上限要按全公司的正常访问量设置。
 * - loginLimiter: 登录接口单独限流，按 IP + 用户名计数，只统计失败的登录，
 *   防止暴力破解，又不影响大家同时登录。
 */

const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
const DEFAULT_API_MAX = 3000;
const LOGIN_MAX_FAILURES = 20;

const TOO_MANY_REQUESTS = {
  success: false,
  message: '请求过于频繁，请稍后再试'
};

/**
 * 读取正整数环境变量，未设置或非法时返回默认值
 *
 * @param {string} name - 环境变量名
 * @param {number} fallback - 默认值
 * @returns {number}
 */
const readPositiveInt = (name, fallback) => {
  const value = parseInt(process.env[name], 10);
  return Number.isInteger(value) && value > 0 ? value : fallback;
};

/**
 * 创建整体 API 限流中间件
 *
 * @returns {Function} Express 中间件
 */
const createApiLimiter = () => rateLimit({
  windowMs: readPositiveInt('RATE_LIMIT_WINDOW_MS', FIFTEEN_MINUTES_MS),
  limit: readPositiveInt('RATE_LIMIT_MAX_REQUESTS', DEFAULT_API_MAX),
  standardHeaders: 'draft-6',
  legacyHeaders: false,
  message: TOO_MANY_REQUESTS
});

/**
 * 创建登录限流中间件：同一 IP + 用户名在窗口内最多失败 LOGIN_MAX_FAILURES 次
 *
 * @returns {Function} Express 中间件
 */
const createLoginLimiter = () => rateLimit({
  windowMs: FIFTEEN_MINUTES_MS,
  limit: LOGIN_MAX_FAILURES,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-6',
  legacyHeaders: false,
  keyGenerator: (req) => {
    const username = String(req.body?.username || '').trim().toLowerCase();
    return `${ipKeyGenerator(req.ip)}:${username}`;
  },
  message: { success: false, message: '登录失败次数过多，请 15 分钟后再试' }
});

module.exports = {
  apiLimiter: createApiLimiter(),
  loginLimiter: createLoginLimiter(),
  createApiLimiter,
  createLoginLimiter,
  DEFAULT_API_MAX,
  LOGIN_MAX_FAILURES
};
