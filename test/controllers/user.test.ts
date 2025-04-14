import * as userController from '../../src/controllers/user';
import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

jest.mock('../../src/db', () => ({
    query: jest.fn(),
}));

jest.mock('bcrypt');
jest.mock('jsonwebtoken');

const mockRequest = (body: any) => ({
    body,
}) as unknown as Request;

const mockRequestParams = (params: any) => ({
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
        let db = jest.requireMock('../../src/db')
        db.query.mockResolvedValueOnce({ rows: [] });
        const req = mockRequest({ email: 'test@example.com', password: 'password' });
        const res = mockResponse();

        await userController.loginUser(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: 'User not found', status: 'error' });
    });

    it('should return 401 if password is incorrect', async () => {
        let db = jest.requireMock('../../src/db')
        db.query.mockResolvedValueOnce({ rows: [{ email: 'test@example.com', password_hash: 'hashedPassword' }] });
        (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

        const req = mockRequest({ email: 'test@example.com', password: 'wrongPassword' });
        const res = mockResponse();

        await userController.loginUser(req, res);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: 'Invalid email or password', status: 'error' });
    });

    it('should return 200 and set token if login is successful', async () => {
        const user = { id: 1, email: 'test@example.com', password_hash: 'hashedPassword' };
        let db = jest.requireMock('../../src/db')
        db.query.mockResolvedValueOnce({ rows: [user] });
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

describe('createUser', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return 400 if validation fails', async () => {
        const req = mockRequest({ name: '', email: 'invalid', password: 'short' });
        const res = mockResponse();

        await userController.createUser(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'Please ensure all fields are filled out correctly' , status: 'error' });
    });

    it('should return 409 if email already exists', async () => {
        let db = jest.requireMock('../../src/db');
        db.query.mockResolvedValueOnce({ rows: [{ email: 'test@example.com' }] }); // Mock email check

        const req = mockRequest({ name: 'Test', email: 'test@example.com', password: 'securePass123' });
        const res = mockResponse();

        await userController.createUser(req, res);

        expect(res.status).toHaveBeenCalledWith(409);
        expect(res.json).toHaveBeenCalledWith({ message: 'An account with this email already exists.', status: 'error' });
    });

    it('should return 400 if email domain is invalid (no MX record)', async () => {
        let db = jest.requireMock('../../src/db');
        db.query.mockResolvedValueOnce({ rows: [] }); // no existing user

        jest.spyOn(require('dns/promises'), 'resolveMx').mockRejectedValueOnce(new Error('No MX'));

        const req = mockRequest({ name: 'Test', email: 'fake@nonexistentdomain.abc', password: 'securePass123' });
        const res = mockResponse();

        await userController.createUser(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'Invalid email domain.', status: 'error' });
    });

    it('should return 201 if user is created successfully', async () => {
        let db = jest.requireMock('../../src/db');
        db.query
            .mockResolvedValueOnce({ rows: [] }) // email check
            .mockResolvedValueOnce({ rows: [{ name: 'Test', email: 'test@example.com' }] }); // insert result

        jest.spyOn(require('dns/promises'), 'resolveMx').mockResolvedValueOnce([{ exchange: 'mail.example.com', priority: 10 }]);

        (bcrypt.hash as jest.Mock).mockResolvedValueOnce('hashedPassword');

        const req = mockRequest({ name: 'Test', email: 'test@example.com', password: 'securePass123' });
        const res = mockResponse();

        await userController.createUser(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({ message: { email: 'test@example.com', name: 'Test' }, status: 'success' });
    });
});

describe('deleteUser', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return 400 if user ID is invalid', async () => {
        const req = mockRequestParams({ id: 'invalid-id' });
        const res = mockResponse();

        await userController.deleteUser(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'Invalid user ID', status: 'error' });
    });

    it('should return 404 if user is not found', async () => {
        let db = jest.requireMock('../../src/db')
        db.query.mockResolvedValueOnce({ rows: [] });
        const req = mockRequestParams({ id: 1 });
        const res = mockResponse();

        await userController.deleteUser(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: 'User not found', status: 'error' });
    });

    it('should return 200 if user is successfully deleted', async () => {
        let db = jest.requireMock('../../src/db')
        db.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
        const req = mockRequestParams({ id: 1 });
        const res = mockResponse();

        await userController.deleteUser(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ data: {message: 'User deleted successfully'}, status: 'success' });
    });
});