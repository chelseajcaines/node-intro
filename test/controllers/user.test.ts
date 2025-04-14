import * as userController from '../../src/controllers/user';
import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

jest.mock('../../src/db', () => ({
    query: jest.fn(),
}));

jest.mock('bcrypt');
jest.mock('jsonwebtoken');

const mockRequestWithCookies = (cookies: any) => ({
    cookies,
}) as unknown as Request;

const mockRequest = (body: any) => ({
    body,
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
    let db: any;

    beforeEach(() => {
        jest.clearAllMocks();
        db = require('../../src/db');
    });

    it('should return 401 if no token is found in cookies', async () => {
        const req = mockRequestWithCookies({});
        const res = mockResponse();

        await userController.validateUser(req, res);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: 'No token found, please log in' });
    });

    it('should return 404 if user is not found in the database', async () => {
        (jwt.verify as jest.Mock).mockReturnValue({ id: 123 });
        db.query.mockResolvedValueOnce({ rows: [] });

        const req = mockRequestWithCookies({ token: 'valid-token' });
        const res = mockResponse();

        await userController.validateUser(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
    });

    it('should return 401 if token does not match the one stored in DB', async () => {
        (jwt.verify as jest.Mock).mockReturnValue({ id: 123 });
        db.query.mockResolvedValueOnce({ rows: [{ id: 123, session_token: 'different-token' }] });

        const req = mockRequestWithCookies({ token: 'valid-token' });
        const res = mockResponse();

        await userController.validateUser(req, res);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: 'Token mismatch, please log in again' });
    });

    it('should return 200 and user data if token is valid and matches DB', async () => {
        const user = {
            id: 123,
            email: 'test@example.com',
            name: 'Test User',
            session_token: 'valid-token',
        };

        (jwt.verify as jest.Mock).mockReturnValue({ id: 123 });
        db.query.mockResolvedValueOnce({ rows: [user] });

        const req = mockRequestWithCookies({ token: 'valid-token' });
        const res = mockResponse();

        await userController.validateUser(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            user: {
                id: 123,
                email: 'test@example.com',
                name: 'Test User',
            },
        });
    });

    it('should return 500 if an error is thrown', async () => {
        (jwt.verify as jest.Mock).mockImplementation(() => {
            throw new Error('Token error');
        });

        const req = mockRequestWithCookies({ token: 'some-token' });
        const res = mockResponse();

        await userController.validateUser(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: 'Failed to validate session' });
    });
});

// describe('createUser', () => {
//     beforeEach(() => {
//         jest.clearAllMocks();
//     });

// })

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