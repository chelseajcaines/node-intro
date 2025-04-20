jest.mock('jsonwebtoken');
jest.mock('../../src/db', () => ({
  __esModule: true,
  default: {
    query: jest.fn(),
  },
}));

import * as expenseController from '../../src/controllers/expense';
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';

const db = require('../../src/db').default;

const mockRequest = (body: any, cookies = {}, params = {}) =>
  ({ body, cookies, params } as unknown as Request);

const mockResponse = () => {
    const res = {
      status: jest.fn(),
      json: jest.fn(),
    };
    res.status.mockReturnValue(res);
    res.json.mockReturnValue(res);
    return res as unknown as Response;
  };

  describe('createExpense', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });
  
    it('should return 401 if no token is provided', async () => {
      const req = mockRequest({
        category: 'Food',
        location: 'Cafe',
        amount: 20,
        date: '2025-04-01',
        payment: 'Cash',
        deduction: 'None',
      });
      const res = mockResponse();
  
      await expenseController.createExpense(req, res);
  
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Unauthorized: Please log in', status: 'error' });
    });

    it('should return 400 if validation fails', async () => {
        (jwt.verify as jest.Mock).mockReturnValueOnce({ id: 1 });
    
        const req = mockRequest(
          {
            category: '',
            location: '',
            amount: -10,
            date: 'invalid-date',
            payment: 'Cheque', // invalid value
            deduction: 'SomethingElse', // invalid value
          },
          { token: 'validtoken' }
        );
        const res = mockResponse();
    
        await expenseController.createExpense(req, res);
    
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          message: 'Please ensure all fields are filled out correctly',
          status: 'error',
        });

    });

    it('should insert expense and return success response', async () => {
      (jwt.verify as jest.Mock).mockReturnValueOnce({ id: 1 });
  
      const expenseData = {
        category: 'Transport',
        location: 'Metro',
        amount: 3.5,
        date: '2025-04-01',
        payment: 'Debit',
        deduction: 'None',
      };
  
      const insertedExpense = {
        id: 1,
        user_id: 1,
        ...expenseData,
        created_at: new Date(),
      };

      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [insertedExpense] });

    const req = mockRequest(expenseData, { token: 'validtoken' });
    const res = mockResponse();

    await expenseController.createExpense(req, res);

    expect(db.query).toHaveBeenCalledWith(
        `INSERT INTO expense_table (user_id, category, location, amount, date, payment, deduction) VALUES ($1, $2, $3, $4, $5::DATE, $6, $7) RETURNING *`,
        [1, 'Transport', 'Metro', 3.5, '2025-04-01T00:00:00.000Z', 'Debit', 'None']
      );

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ status: 'success', data: insertedExpense });
  });

  it('should return 500 if database error occurs', async () => {
    (jwt.verify as jest.Mock).mockReturnValueOnce({ id: 1 });

    (db.query as jest.Mock).mockRejectedValueOnce(new Error('Database error'));

    const req = mockRequest(
      {
        category: 'Rent',
        location: 'Apartment',
        amount: 1000,
        date: '2025-04-01',
        payment: 'Credit',
        deduction: 'None',
      },
      { token: 'validtoken' }
    );

    const res = mockResponse();

    await expenseController.createExpense(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Error saving expense', status: 'error' });
  });

  it('should return 401 if token is invalid', async () => {
    (jwt.verify as jest.Mock).mockImplementation(() => {
      throw new Error('Invalid token');
    });

    const req = mockRequest(
      {
        category: 'Utilities',
        location: 'Home',
        amount: 150,
        date: '2025-04-01',
        payment: 'Credit',
        deduction: 'None',
      },
      { token: 'invalidtoken' }
    );
    const res = mockResponse();

    await expenseController.createExpense(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Unauthorized: Please log in', status: 'error' });
  });
});

describe('getExpense', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });
  
    it('should return 401 if no token is provided', async () => {
      const req = mockRequest({});
      const res = mockResponse();
  
      await expenseController.getExpense(req, res);
  
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ status: 'error', message: 'Unauthorized: Please log in' });
    });
  
    it('should return 401 if token is invalid', async () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });
  
      const req = mockRequest({}, { token: 'invalidtoken' });
      const res = mockResponse();
  
      await expenseController.getExpense(req, res);
  
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ status: 'error', message: 'Unauthorized: Please log in' });
    });
  
    it('should return expenses for valid user', async () => {
      (jwt.verify as jest.Mock).mockReturnValueOnce({ id: 1 });
  
      const expenses = [
        {
          id: 1,
          user_id: 1,
          category: 'Transport',
          location: 'Metro',
          amount: 3.5,
          date: '2025-04-01',
          payment: 'Debit',
          deduction: 'None',
          created_at: new Date(),
        },
      ];
  
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: expenses });
  
      const req = mockRequest({}, { token: 'validtoken' });
      const res = mockResponse();
  
      await expenseController.getExpense(req, res);
  
      expect(db.query).toHaveBeenCalledWith('SELECT * FROM expense_table WHERE user_id = $1', [1]);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ status: 'success', data: expenses });
    });
  
    it('should return 500 if database error occurs', async () => {
      (jwt.verify as jest.Mock).mockReturnValueOnce({ id: 1 });
  
      (db.query as jest.Mock).mockRejectedValueOnce(new Error('DB failure'));
  
      const req = mockRequest({}, { token: 'validtoken' });
      const res = mockResponse();
  
      await expenseController.getExpense(req, res);
  
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ status: 'error', message: 'Error retrieving expense' });
    });
  });

  describe('deleteExpense', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });
  
    it('should return 401 if no token is provided', async () => {
      const req = mockRequest({}, {}, { id: '1' });
      const res = mockResponse();
  
      await expenseController.deleteExpense(req, res);
  
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ status: 'error', message: 'Unauthorized: Please log in' });
    });
  
    it('should return 401 if token is invalid', async () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });
  
      const req = mockRequest({}, { token: 'badtoken' }, { id: '1' });
      const res = mockResponse();
  
      await expenseController.deleteExpense(req, res);
  
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ status: 'error', message: 'Unauthorized: Please log in' });
    });
  
    it('should return 404 if no expense is found or not owned by user', async () => {
      (jwt.verify as jest.Mock).mockReturnValueOnce({ id: 1 });
      (db.query as jest.Mock).mockResolvedValueOnce({ rowCount: 0 });
  
      const req = mockRequest({}, { token: 'validtoken' }, { id: '99' });
      const res = mockResponse();
  
      await expenseController.deleteExpense(req, res);
  
      expect(db.query).toHaveBeenCalledWith(
        'DELETE FROM expense_table WHERE id = $1 AND user_id = $2 RETURNING *',
        [99, 1]
      );
  
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ status: 'error', message: 'Expense not found or unauthorized' });
    });
  
    it('should return 200 if expense is successfully deleted', async () => {
      (jwt.verify as jest.Mock).mockReturnValueOnce({ id: 1 });
      (db.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1 });
  
      const req = mockRequest({}, { token: 'validtoken' }, { id: '5' });
      const res = mockResponse();
  
      await expenseController.deleteExpense(req, res);
  
      expect(db.query).toHaveBeenCalledWith(
        'DELETE FROM expense_table WHERE id = $1 AND user_id = $2 RETURNING *',
        [5, 1]
      );
  
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ status: 'success', data: 'Expense deleted successfully' });
    });
  
    it('should return 500 if database throws error', async () => {
      (jwt.verify as jest.Mock).mockReturnValueOnce({ id: 1 });
      (db.query as jest.Mock).mockRejectedValueOnce(new Error('DB crash'));
  
      const req = mockRequest({}, { token: 'validtoken' }, { id: '2' });
      const res = mockResponse();
  
      await expenseController.deleteExpense(req, res);
  
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ status: 'error', message: 'Error deleting expense' });
    });
  });

  describe('updateExpense', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });
  
    const validBody = {
      category: 'Food',
      location: 'Supermarket',
      amount: 25.5,
      date: '2025-04-01',
      payment: 'Debit',
      deduction: 'None',
    };
  
    it('should return 401 if no token is provided', async () => {
      const req = mockRequest(validBody, {}, { id: '1' });
      const res = mockResponse();
  
      await expenseController.updateExpense(req, res);
  
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ status: 'error', message: 'Unauthorized: Please log in' });
    });
  
    it('should return 401 if token is invalid', async () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });
  
      const req = mockRequest(validBody, { token: 'badtoken' }, { id: '1' });
      const res = mockResponse();
  
      await expenseController.updateExpense(req, res);
  
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ status: 'error', message: 'Unauthorized: Please log in' });
    });
  
    it('should return 400 if expense ID is invalid', async () => {
      (jwt.verify as jest.Mock).mockReturnValueOnce({ id: 1 });
  
      const req = mockRequest(validBody, { token: 'validtoken' }, { id: 'not-a-number' });
      const res = mockResponse();
  
      await expenseController.updateExpense(req, res);
  
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ status: 'error', message: 'Invalid expense ID' });
    });
  
    it('should return 400 if validation fails', async () => {
      (jwt.verify as jest.Mock).mockReturnValueOnce({ id: 1 });
  
      const invalidBody = { ...validBody, amount: -10 };
  
      const req = mockRequest(invalidBody, { token: 'validtoken' }, { id: '2' });
      const res = mockResponse();
  
      await expenseController.updateExpense(req, res);
  
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Please ensure all fields are filled out correctly',
      });
    });
  
    it('should return 404 if no matching expense is found', async () => {
      (jwt.verify as jest.Mock).mockReturnValueOnce({ id: 1 });
      (db.query as jest.Mock).mockResolvedValueOnce({ rowCount: 0 });
  
      const req = mockRequest(validBody, { token: 'validtoken' }, { id: '5' });
      const res = mockResponse();
  
      await expenseController.updateExpense(req, res);
  
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE expense_table'),
        expect.arrayContaining([
          validBody.category,
          validBody.location,
          validBody.amount,
          expect.stringMatching(/^2025-04-01/), // accept date-only or full ISO
          validBody.payment,
          validBody.deduction,
          5,
          1,
        ])
      );
  
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ status: 'error', message: 'Expense not found or unauthorized' });
    });
  
    it('should return 200 and updated expense if successful', async () => {
      (jwt.verify as jest.Mock).mockReturnValueOnce({ id: 1 });
      const updatedExpense = { id: 5, ...validBody, user_id: 1 };
      (db.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1, rows: [updatedExpense] });
  
      const req = mockRequest(validBody, { token: 'validtoken' }, { id: '5' });
      const res = mockResponse();
  
      await expenseController.updateExpense(req, res);
  
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ status: 'success', data: updatedExpense });
    });
  
    it('should return 500 if DB query fails', async () => {
      (jwt.verify as jest.Mock).mockReturnValueOnce({ id: 1 });
      (db.query as jest.Mock).mockRejectedValueOnce(new Error('DB error'));
  
      const req = mockRequest(validBody, { token: 'validtoken' }, { id: '3' });
      const res = mockResponse();
  
      await expenseController.updateExpense(req, res);
  
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ status: 'error', message: 'Error updating expense' });
    });
  });