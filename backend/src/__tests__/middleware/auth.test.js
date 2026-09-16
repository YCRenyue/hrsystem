/**
 * Authentication middleware tests for mandatory password changes.
 */

const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../../config/jwt');
const { User } = require('../../models');
const { authenticateToken } = require('../../middleware/auth');

const token = jwt.sign({ user_id: 'user-1' }, JWT_SECRET, { expiresIn: '5m' });

const createResponse = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis()
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('authenticateToken password change enforcement', () => {
  const user = {
    is_active: true,
    status: 'active',
    must_change_password: true,
    isPasswordExpired: () => false,
    toSafeObject: () => ({
      user_id: 'user-1',
      role: 'employee',
      must_change_password: true
    })
  };

  test('blocks normal API access until the password changes', async () => {
    jest.spyOn(User, 'findByPk').mockResolvedValue(user);
    const req = {
      headers: { authorization: `Bearer ${token}` },
      originalUrl: '/api/employees'
    };
    const res = createResponse();
    const next = jest.fn();

    await authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 'PASSWORD_CHANGE_REQUIRED'
    }));
    expect(next).not.toHaveBeenCalled();
  });

  test('allows the password change endpoint', async () => {
    jest.spyOn(User, 'findByPk').mockResolvedValue(user);
    const req = {
      headers: { authorization: `Bearer ${token}` },
      originalUrl: '/api/users/change-password'
    };
    const res = createResponse();
    const next = jest.fn();

    await authenticateToken(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});
