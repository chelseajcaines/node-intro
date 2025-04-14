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
        const db = jest.requireMock('../../src/db');
        db.query.mockResolvedValueOnce({ rows: [] });

        await userController.validateUser(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
    });

    it('should return 401 if session token does not match', async () => {
        const req = { cookies: { token: 'valid-token' } } as unknown as Request;
        const res = mockResponse();

        (jwt.verify as jest.Mock).mockReturnValue({ id: 1 });
        const db = jest.requireMock('../../src/db');
        db.query.mockResolvedValueOnce({
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
        const db = jest.requireMock('../../src/db');
        db.query.mockResolvedValueOnce({
            rows: [{ id: 1, email: 'test@example.com', name: 'Test User', session_token: 'valid-token' }]
        });

        await userController.validateUser(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            user: { id: 1, email: 'test@example.com', name: 'Test User' }
        });
    });
});

// describe('createUser', () => {
//     beforeEach(() => {
//         jest.clearAllMocks();
//     });

//     it('should return 400 if validation fails', async () => {
//         const req = mockRequest({ name: '', email: 'invalid', password: 'short' });
//         const res = mockResponse();

//         await userController.createUser(req, res);

//         expect(res.status).toHaveBeenCalledWith(400);
//         expect(res.json).toHaveBeenCalledWith({ message: 'Please ensure all fields are filled out correctly', status: 'error' });
//     });

//     it('should return 409 if email already exists', async () => {
//         let db = jest.requireMock('../../src/db')
//         db.query.mockResolvedValueOnce({ rows: [{ email: 'test@example.com' }] });
//         const req = mockRequest({ name: 'Test', email: 'test@example.com', password: 'password' });
//         const res = mockResponse();

//         await userController.createUser(req, res);

//         expect(res.status).toHaveBeenCalledWith(409);
//         expect(res.json).toHaveBeenCalledWith({ message: 'Email is already in use', status: 'error' });
//     });

//     it('should create user and return 201 on success', async () => {
//         let db = jest.requireMock('../../src/db')
//         db.query
//             .mockResolvedValueOnce({ rows: [] }) // Check if email exists
//             .mockResolvedValueOnce({ rows: [{ email: 'test@example.com', name: 'Test' }] }); // Insert user

//         const req = mockRequest({ name: 'Test', email: 'test@example.com', password: 'password' });
//         const res = mockResponse();

//         await userController.createUser(req, res);

//         expect(res.status).toHaveBeenCalledWith(201);
//         expect(res.json).toHaveBeenCalledWith({ status: 'success', data: { email: 'test@example.com', name: 'Test' } });
//     });
// });