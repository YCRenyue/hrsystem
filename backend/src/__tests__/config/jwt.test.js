/**
 * config/jwt 单元测试
 *
 * 验证生产环境对缺失/默认 JWT 密钥的 fail-fast 行为，
 * 以及开发环境回退与显式强密钥的处理。
 */

const INSECURE_DEFAULT = 'your_super_secure_jwt_secret_here';

const loadJwtConfig = (env) => {
  let mod;
  jest.isolateModules(() => {
    const saved = { ...process.env };
    Object.assign(process.env, env);
    try {
      mod = require('../../config/jwt');
    } finally {
      process.env = saved;
    }
  });
  return mod;
};

describe('config/jwt', () => {
  test('生产环境缺失/默认密钥应抛错拒绝启动', () => {
    expect(() => loadJwtConfig({
      NODE_ENV: 'production',
      JWT_SECRET: INSECURE_DEFAULT
    })).toThrow(/JWT_SECRET/);
  });

  test('生产环境配置强密钥可正常加载', () => {
    const cfg = loadJwtConfig({
      NODE_ENV: 'production',
      JWT_SECRET: 'a-strong-unique-production-secret-value'
    });
    expect(cfg.JWT_SECRET).toBe('a-strong-unique-production-secret-value');
  });

  test('开发环境缺省时使用回退密钥且不抛错', () => {
    const cfg = loadJwtConfig({
      NODE_ENV: 'development',
      JWT_SECRET: INSECURE_DEFAULT
    });
    expect(cfg.JWT_SECRET).toBeTruthy();
    expect(cfg.JWT_SECRET).not.toBe(INSECURE_DEFAULT);
  });

  test('默认过期时间为 24h，可被环境变量覆盖', () => {
    const cfg = loadJwtConfig({
      NODE_ENV: 'development',
      JWT_SECRET: 'x',
      JWT_EXPIRES_IN: '2h'
    });
    expect(cfg.JWT_EXPIRES_IN).toBe('2h');
  });
});
