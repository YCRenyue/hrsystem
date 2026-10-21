/**
 * Rate limiter 中间件测试
 */

const express = require('express');
const request = require('supertest');
const {
  createApiLimiter, createLoginLimiter, DEFAULT_API_MAX, LOGIN_MAX_FAILURES
} = require('../../middleware/rateLimiter');

/**
 * 构造只挂登录限流的小应用：password 为 ok 时登录成功，否则 401
 */
const buildLoginApp = () => {
  const app = express();
  app.use(express.json());
  app.post('/login', createLoginLimiter(), (req, res) => {
    if (req.body.password === 'ok') return res.json({ success: true });
    return res.status(401).json({ success: false });
  });
  return app;
};

describe('apiLimiter', () => {
  const original = process.env.RATE_LIMIT_MAX_REQUESTS;

  afterEach(() => {
    if (original === undefined) delete process.env.RATE_LIMIT_MAX_REQUESTS;
    else process.env.RATE_LIMIT_MAX_REQUESTS = original;
  });

  test('未配置时默认上限为 3000', async () => {
    delete process.env.RATE_LIMIT_MAX_REQUESTS;
    const app = express();
    app.use(createApiLimiter());
    app.get('/ping', (req, res) => res.json({ ok: true }));

    const res = await request(app).get('/ping');

    expect(DEFAULT_API_MAX).toBe(3000);
    expect(res.headers['ratelimit-limit']).toBe('3000');
  });
});

describe('loginLimiter', () => {
  test('同一用户名连续失败超过上限后返回 429', async () => {
    const app = buildLoginApp();
    for (let i = 0; i < LOGIN_MAX_FAILURES; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      const res = await request(app).post('/login').send({ username: 'hr', password: 'bad' });
      expect(res.status).toBe(401);
    }

    const blocked = await request(app).post('/login').send({ username: 'hr', password: 'bad' });
    expect(blocked.status).toBe(429);

    const otherUser = await request(app).post('/login').send({ username: 'emp', password: 'ok' });
    expect(otherUser.status).toBe(200);
  });

  test('登录成功不计入次数', async () => {
    const app = buildLoginApp();
    for (let i = 0; i < LOGIN_MAX_FAILURES + 5; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      const res = await request(app).post('/login').send({ username: 'hr', password: 'ok' });
      expect(res.status).toBe(200);
    }
  });
});
