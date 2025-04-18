jest.mock('crypto');
jest.mock('nodemailer');
jest.mock('bcrypt');
jest.mock('../../src/db', () => {
  return {
    __esModule: true,
    default: {
      query: jest.fn(),
    },
  };
});

import * as authController from '../../src/controllers/auth';
import { Request, Response } from 'express';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import bcrypt from 'bcrypt';

const db = require('../../src/db').default;

const mockRequest = (body: any, params = {}) => ({
    body,
    params,
}) as unknown as Request;

const mockResponse = () => {
    const res = {
      status: jest.fn(),
      json: jest.fn(),
    };
    res.status.mockReturnValue(res);
    res.json.mockReturnValue(res);
    return res as unknown as Response;
};

describe('forgotPassword', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });
  
    it('should return 400 if email is missing', async () => {
      const req = mockRequest({});
      const res = mockResponse();
  
      await authController.forgotPassword(req, res);
  
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Email is required.' });
    });

    it('should return 400 if user with email does not exist', async () => {
        (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });
    
        const req = mockRequest({ email: 'notfound@example.com' });
        const res = mockResponse();
    
        await authController.forgotPassword(req, res);
    
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'User with this email does not exist.' });
      });

      it('should update user with reset token and send email', async () => {
        const fakeUser = { id: 1, email: 'user@example.com' };
        (db.query as jest.Mock)
          .mockResolvedValueOnce({ rows: [fakeUser] }) // user lookup
          .mockResolvedValueOnce({}); // update query
    
          const mockHexToken = '6d6f636b6564746f6b656e313233343536';
          (crypto.randomBytes as jest.Mock).mockReturnValueOnce(Buffer.from(mockHexToken, 'hex'));
    
        const sendMailMock = jest.fn().mockResolvedValue(true);
        (nodemailer.createTransport as jest.Mock).mockReturnValueOnce({
          sendMail: sendMailMock,
        });

        const req = mockRequest({ email: 'user@example.com' });
    const res = mockResponse();

    await authController.forgotPassword(req, res);

    expect(db.query).toHaveBeenCalledWith(
      'SELECT * FROM user_table WHERE email = $1',
      ['user@example.com']
    );

    expect(db.query).toHaveBeenCalledWith(
        'UPDATE user_table SET reset_password_token = $1, reset_password_expiration = to_timestamp($2) WHERE email = $3',
        [mockHexToken, expect.any(Number), 'user@example.com']
      );

    expect(sendMailMock).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: 'Password Reset Request',
          html: expect.stringContaining('Reset Password'),
        })
      );
  
      expect(res.json).toHaveBeenCalledWith({
        message: 'Password reset email sent',
        resetToken: mockHexToken,
      });
    });

    it('should return 500 on server error', async () => {
        (db.query as jest.Mock).mockRejectedValueOnce(new Error('DB error'));
    
        const req = mockRequest({ email: 'user@example.com' });
        const res = mockResponse();
    
        await authController.forgotPassword(req, res);
    
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: 'Server error' });
      });
    });

    describe('resetPassword', () => {
        beforeEach(() => {
          jest.clearAllMocks();
        });
      
        it('should return 400 if token is missing', async () => {
          const req = mockRequest({ newPassword: 'newpass123' });
          const res = mockResponse();
      
          await authController.resetPassword(req, res);
      
          expect(res.status).toHaveBeenCalledWith(400);
          expect(res.json).toHaveBeenCalledWith({ message: 'Reset token is required.' });
        });
      
        it('should return 400 if newPassword is missing', async () => {
          const req = mockRequest({ token: 'sometoken' });
          const res = mockResponse();
      
          await authController.resetPassword(req, res);
      
          expect(res.status).toHaveBeenCalledWith(400);
          expect(res.json).toHaveBeenCalledWith({ message: 'New password is required.' });
        });
      
        it('should return 400 if newPassword is too short', async () => {
          const req = mockRequest({ token: 'sometoken', newPassword: '123' });
          const res = mockResponse();
      
          await authController.resetPassword(req, res);
      
          expect(res.status).toHaveBeenCalledWith(400);
          expect(res.json).toHaveBeenCalledWith({ message: 'Password must be at least 6 characters long.' });
        });
      
        it('should return 400 if token is invalid or expired', async () => {
          (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });
      
          const req = mockRequest({ token: 'invalidtoken', newPassword: 'validPass123' });
          const res = mockResponse();
      
          await authController.resetPassword(req, res);
      
          expect(res.status).toHaveBeenCalledWith(400);
          expect(res.json).toHaveBeenCalledWith({ message: 'Invalid or expired token' });
        });
      
        it('should hash password and update the user if token is valid', async () => {
          const user = { id: 1, email: 'test@example.com' };
      
          (db.query as jest.Mock)
            .mockResolvedValueOnce({ rows: [user] }) // First query to find the user with token
            .mockResolvedValueOnce({}); // Second query to update the password
      
          (bcrypt.hash as jest.Mock).mockResolvedValueOnce('hashedNewPassword');
      
          const req = mockRequest({ token: 'validtoken', newPassword: 'validPass123' });
          const res = mockResponse();
      
          await authController.resetPassword(req, res);
      
          expect(bcrypt.hash).toHaveBeenCalledWith('validPass123', 10);
          expect(db.query).toHaveBeenCalledWith(
            'UPDATE user_table SET password_hash = $1, reset_password_token = NULL, reset_password_expiration = NULL WHERE id = $2',
            ['hashedNewPassword', user.id]
          );
          expect(res.json).toHaveBeenCalledWith({ message: 'Password reset successful' });
        });
      
        it('should return 500 if an error occurs', async () => {
          (db.query as jest.Mock).mockRejectedValueOnce(new Error('DB error'));
      
          const req = mockRequest({ token: 'validtoken', newPassword: 'validPass123' });
          const res = mockResponse();
      
          await authController.resetPassword(req, res);
      
          expect(res.status).toHaveBeenCalledWith(500);
          expect(res.json).toHaveBeenCalledWith({ message: 'Server error' });
        });
      });
