jest.mock('dns/promises', () => ({
    resolveMx: jest.fn(),
  }));

jest.mock('../../src/db', () => {
    return {
      __esModule: true,
      default: {
        query: jest.fn(),
      },
    };
  });

jest.mock('bcrypt');
jest.mock('jsonwebtoken');

import * as userController from '../../src/controllers/user';
import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { resolveMx } from 'dns/promises';



const mockRequest = (body: any, params = {}) => ({
    body,
    params,
  }) as unknown as Request;

const mockResponse = () => {
    const res = {
        status: jest.fn(),
        json: jest.fn(),
        cookie: jest.fn(),
    };
    res.status.mockReturnValue(res);
    res.json.mockReturnValue(res);
    return res as unknown as Response;
};

describe('loginUser', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return 400 if email is invalid', async () => {
        const req = mockRequest({ email: 'invalid-email', password: 'password' });
        const res = mockResponse();

        await userController.loginUser(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'Invalid email format', status: 'error'});
    });

    it('should return 404 if user is not found', async () => {
        const db = require('../../src/db').default;
        (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });
        const req = mockRequest({ email: 'test@example.com', password: 'password' });
        const res = mockResponse();

        await userController.loginUser(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: 'User not found', status: 'error' });
    });

    it('should return 401 if password is incorrect', async () => {
        const db = require('../../src/db').default;
        (db.query as jest.Mock).mockResolvedValueOnce({ rows: [{ email: 'test@example.com', password_hash: 'hashedPassword' }] });
        (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

        const req = mockRequest({ email: 'test@example.com', password: 'wrongPassword' });
        const res = mockResponse();

        await userController.loginUser(req, res);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: 'Invalid email or password', status: 'error' });
    });

    it('should return 200 and set token if login is successful', async () => {
        const user = { id: 1, email: 'test@example.com', password_hash: 'hashedPassword' };
        const db = require('../../src/db').default;
        (db.query as jest.Mock).mockResolvedValueOnce({ rows: [user] });
        (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);
        (jwt.sign as jest.Mock).mockReturnValueOnce('fake-jwt-token');

        const req = mockRequest({ email: 'test@example.com', password: 'password' });
        const res = mockResponse();

        await userController.loginUser(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.cookie).toHaveBeenCalledWith('token', 'fake-jwt-token', { httpOnly: true, secure: false, maxAge: 3600000, sameSite: 'lax' });
        expect(res.json).toHaveBeenCalledWith({ serviceToken: 'fake-jwt-token', user: { id: 1, email: 'test@example.com' } });
    });
});

describe('validateUser', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return 401 if no token is provided', async () => {
        const req = { cookies: {} } as unknown as Request;
        const res = mockResponse();

        await userController.validateUser(req, res);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: 'No token found, please log in' });
    });

    it('should return 500 if token verification fails', async () => {
        const req = { cookies: { token: 'invalid-token' } } as unknown as Request;
        const res = mockResponse();

        (jwt.verify as jest.Mock).mockImplementation(() => {
            throw new Error('Invalid token');
        });

        await userController.validateUser(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: 'Failed to validate session' });
    });

    it('should return 404 if user is not found in the database', async () => {
        const req = { cookies: { token: 'valid-token' } } as unknown as Request;
        const res = mockResponse();

        (jwt.verify as jest.Mock).mockReturnValue({ id: 1 });
        const db = require('../../src/db').default;
        (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

        await userController.validateUser(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
    });

    it('should return 401 if session token does not match', async () => {
        const req = { cookies: { token: 'valid-token' } } as unknown as Request;
        const res = mockResponse();

        (jwt.verify as jest.Mock).mockReturnValue({ id: 1 });
        const db = require('../../src/db').default;
        (db.query as jest.Mock).mockResolvedValueOnce({
            rows: [{ id: 1, email: 'test@example.com', name: 'Test User', session_token: 'different-token' }]
        });

        await userController.validateUser(req, res);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: 'Token mismatch, please log in again' });
    });

    it('should return 200 and user data if session is valid', async () => {
        const req = { cookies: { token: 'valid-token' } } as unknown as Request;
        const res = mockResponse();

        (jwt.verify as jest.Mock).mockReturnValue({ id: 1 });
        const db = require('../../src/db').default;
        (db.query as jest.Mock).mockResolvedValueOnce({
            rows: [{ id: 1, email: 'test@example.com', name: 'Test User', session_token: 'valid-token' }]
        });

        await userController.validateUser(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            user: { id: 1, email: 'test@example.com', name: 'Test User' }
        });
    });
});

describe('logoutUser', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });
  
    it('should return 400 if no token is provided', async () => {
      const req = {
        cookies: {},
      } as unknown as Request;
  
      const res = mockResponse();
  
      await userController.logoutUser(req, res);
  
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'No token provided' });
    });
  
    it('should return 200 if logout is successful', async () => {
      const mockUserId = 1;
      const mockToken = 'valid-token';
  
      (jwt.verify as jest.Mock).mockReturnValueOnce({ id: mockUserId });
  
      const db = require('../../src/db').default;
      (db.query as jest.Mock).mockResolvedValueOnce({}); // For the UPDATE query
  
      const req = {
        cookies: { token: mockToken },
      } as unknown as Request;
  
      const res = mockResponse();
      res.clearCookie = jest.fn();
  
      await userController.logoutUser(req, res);
  
      expect(jwt.verify).toHaveBeenCalledWith(mockToken, expect.any(String));
      expect(db.query).toHaveBeenCalledWith(
        'UPDATE user_table SET session_token = NULL WHERE id = $1',
        [mockUserId]
      );
      expect(res.clearCookie).toHaveBeenCalledWith('token', {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Logout successful' });
    });
  
    it('should return 500 if an error occurs during logout', async () => {
      const req = {
        cookies: { token: 'invalid-token' },
      } as unknown as Request;
  
      (jwt.verify as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Invalid token');
      });
  
      const res = mockResponse();
      res.clearCookie = jest.fn();
  
      await userController.logoutUser(req, res);
  
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Failed to log out' });
    });
  });

  describe('createUser', () => {
    const mockHash = bcrypt.hash as jest.Mock;
    
    const mockResolveMx = resolveMx as jest.Mock;
  
    beforeEach(() => {
      jest.clearAllMocks();
    });
  
    it('should create a user successfully', async () => {
      const req = mockRequest({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      });
      const res = mockResponse();
  
      mockResolveMx.mockResolvedValue([{ exchange: 'mail.example.com' }]);
      const db = require('../../src/db').default;
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] }); // No existing email
      mockHash.mockResolvedValue('hashedpassword');
      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ name: 'Test User', email: 'test@example.com' }],
      });
  
      await userController.createUser(req, res);
  
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: { name: 'Test User', email: 'test@example.com' },
      });
    });
  
    it('should return 400 if password is too short', async () => {
      const req = mockRequest({
        name: 'Test',
        email: 'test@example.com',
        password: '123',
      });
      const res = mockResponse();
  
      await userController.createUser(req, res);
  
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Password must be at least 6 characters.',
      });
    });
  
    it('should return 400 if id is included in body', async () => {
      const req = mockRequest({
        id: 5,
        name: 'Test',
        email: 'test@example.com',
        password: 'password123',
      });
      const res = mockResponse();
  
      await userController.createUser(req, res);
  
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'User ID will be generated automatically',
      });
    });
  
    it('should return 400 for invalid email format', async () => {
      const req = mockRequest({
        name: 'Test',
        email: 'bademail',
        password: 'password123',
      });
      const res = mockResponse();
  
      await userController.createUser(req, res);
  
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Invalid email format.',
      });
    });
  
    it('should return 400 if email domain has no MX records', async () => {
      const req = mockRequest({
        name: 'Test',
        email: 'test@nodomain.com',
        password: 'password123',
      });
      const res = mockResponse();
  
      mockResolveMx.mockResolvedValue([]); // No MX records
  
      await userController.createUser(req, res);
  
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Email domain is not accepting mail.',
      });
    });
  
    it('should return 400 if DNS lookup fails', async () => {
      const req = mockRequest({
        name: 'Test',
        email: 'test@baddomain.com',
        password: 'password123',
      });
      const res = mockResponse();
  
      mockResolveMx.mockRejectedValue(new Error('DNS error'));
  
      await userController.createUser(req, res);
  
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Invalid email domain.',
      });
    });
  
    it('should return 409 if email already exists', async () => {
      const req = mockRequest({
        name: 'Test',
        email: 'test@exists.com',
        password: 'password123',
      });
      const res = mockResponse();
  
      mockResolveMx.mockResolvedValue([{ exchange: 'mail.exists.com' }]);
      const db = require('../../src/db').default;
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: 1 }] });
  
      await userController.createUser(req, res);
  
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'An account with this email already exists.',
      });
    });
  
    it('should return 400 if password is undefined', async () => {
      const req = mockRequest({
        name: 'Test',
        email: 'test@example.com',
      });
      const res = mockResponse();
  
      mockResolveMx.mockResolvedValue([{ exchange: 'mail.example.com' }]);
         const db = require('../../src/db').default;
         (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });
  
      await userController.createUser(req, res);
  
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Password must be at least 6 characters.',
      });
    });
  
    it('should return 500 if db insert fails', async () => {
      const req = mockRequest({
        name: 'Test',
        email: 'test@example.com',
        password: 'password123',
      });
      const res = mockResponse();
  
      mockResolveMx.mockResolvedValue([{ exchange: 'mail.example.com' }]);
      const db = require('../../src/db').default;
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] }); // No existing user
      mockHash.mockResolvedValue('hashedpassword');
      (db.query as jest.Mock).mockResolvedValueOnce(new Error('Insert failed'));
  
      await userController.createUser(req, res);
  
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Error creating user',
      });
    });
  });