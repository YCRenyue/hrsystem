/**
 * seed.js 管理员密码校验测试
 *
 * 只有本次运行写入了密码（新建管理员或要求重置）才校验哈希；
 * 未要求重置时管理员可能已改过密码，不应因此让部署失败。
 */

const seed = require('../../db/seed');
const { sequelize, Department, User } = require('../../models');
const { encryptionService } = require('../../utils/encryption');

const ENV_KEYS = ['SEED_ADMIN_USERNAME', 'SEED_ADMIN_PASSWORD', 'SEED_ADMIN_RESET_PASSWORD'];
const savedEnv = {};

beforeEach(() => {
  ENV_KEYS.forEach((k) => { savedEnv[k] = process.env[k]; });
  process.env.SEED_ADMIN_USERNAME = 'admin123';
  process.env.SEED_ADMIN_PASSWORD = 'seed-password';
  process.exitCode = undefined;
  jest.spyOn(sequelize, 'authenticate').mockResolvedValue();
  jest.spyOn(sequelize, 'close').mockResolvedValue();
  jest.spyOn(Department, 'findOrCreate').mockResolvedValue([{ name: 'x', update: jest.fn() }, true]);
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  ENV_KEYS.forEach((k) => {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  });
  process.exitCode = undefined;
  jest.restoreAllMocks();
});

/**
 * 模拟已存在的管理员，其密码哈希与种子密码不一致（管理员已自行改过密码）
 */
const mockExistingAdmin = () => {
  const admin = { update: jest.fn().mockResolvedValue() };
  jest.spyOn(User, 'findOne').mockResolvedValue(admin);
  const scoped = {
    findOne: jest.fn().mockResolvedValue({
      password_hash: 'changed', status: 'active', login_attempts: 0
    })
  };
  jest.spyOn(User, 'scope').mockReturnValue(scoped);
  jest.spyOn(encryptionService, 'verifyPassword').mockResolvedValue(false);
  jest.spyOn(encryptionService, 'hashPassword').mockResolvedValue('new-hash');
  return scoped;
};

describe('seed admin password check', () => {
  test('未要求重置时跳过校验，管理员改过密码也不失败', async () => {
    process.env.SEED_ADMIN_RESET_PASSWORD = 'false';
    const scoped = mockExistingAdmin();

    await seed();

    expect(scoped.findOne).not.toHaveBeenCalled();
    expect(process.exitCode).toBeUndefined();
  });

  test('要求重置但写入后哈希不匹配时仍然失败', async () => {
    process.env.SEED_ADMIN_RESET_PASSWORD = 'true';
    const scoped = mockExistingAdmin();

    await seed();

    expect(scoped.findOne).toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
  });
});
