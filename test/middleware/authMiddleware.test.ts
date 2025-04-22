jest.mock('jsonwebtoken');
jest.mock('../../src/utils/rest', () => ({
  __esModule: true,
  error: (msg: string) => ({ status: 'error', message: msg }),
}));

import { authenticateToken } from '../../src/middleware/authMiddleware';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const mockRequest = (cookies = {}) => ({
  cookies,
} as unknown as Request);

const mockResponse = () => {
  const res = {
    status: jest.fn(),
    json: jest.fn(),
  };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res as unknown as Response;
};

const mockNext = jest.fn();

describe('authenticateToken middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 if no token is provided', () => {
    const req = mockRequest(); // no cookies
    const res = mockResponse();

    authenticateToken(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      message: 'Token required for authentication',
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 401 if token is expired', () => {
    (jwt.verify as jest.Mock).mockImplementation((_token, _secret, cb) => {
      cb({ name: 'TokenExpiredError' }, null);
    });

    const req = mockRequest({ token: 'expiredtoken' });
    const res = mockResponse();

    authenticateToken(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      message: 'Token expired',
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 401 if token is invalid', () => {
    (jwt.verify as jest.Mock).mockImplementation((_token, _secret, cb) => {
      cb({ name: 'JsonWebTokenError' }, null);
    });

    const req = mockRequest({ token: 'invalidtoken' });
    const res = mockResponse();

    authenticateToken(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      message: 'Invalid token',
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should call next and attach user to req if token is valid', () => {
    const mockUser = { id: 1, email: 'test@example.com' };
    (jwt.verify as jest.Mock).mockImplementation((_token, _secret, cb) => {
      cb(null, mockUser);
    });

    const req = mockRequest({ token: 'validtoken' }) as Request & { user?: any };
    const res = mockResponse();

    authenticateToken(req, res, mockNext);

    expect(req.user).toEqual(mockUser);
    expect(mockNext).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled(); // ensure no response was sent
  });
});