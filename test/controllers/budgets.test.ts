jest.mock('jsonwebtoken');
jest.mock('../../src/db', () => {
  return {
    __esModule: true,
    default: {
      query: jest.fn(),
    },
  };
});

import * as budgetController from '../../src/controllers/budget';
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';


const db = require('../../src/db').default;

const mockRequest = (body: any, cookies = {}, params = {}) => ({
    body,
    cookies,
    params,
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

  describe('createBudget', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });
  
    it('should return 401 if no token is provided', async () => {
      const req = mockRequest({ name: 'Groceries', amount: 100, time: 'Monthly', date: '2025-04-01' });
      const res = mockResponse();
  
      await budgetController.createBudget(req, res);
  
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Unauthorized: Please log in', status: 'error' });
    });

    it('should return 400 if validation fails', async () => {
        (jwt.verify as jest.Mock).mockReturnValueOnce({ id: 1 });
    
        const req = mockRequest({ name: '', amount: -20, time: 'Yearly', date: 'invalid-date' }, { token: 'validtoken' });
        const res = mockResponse();
    
        await budgetController.createBudget(req, res);
    
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'Invalid budget data', status: 'error' });
      });

      it('should insert budget and return success response', async () => {
        (jwt.verify as jest.Mock).mockReturnValueOnce({ id: 1 });
    
        const budgetData = {
          name: 'Groceries',
          amount: 250.5,
          time: 'Monthly',
          date: '2025-04-01',
        };
    
        const insertedBudget = {
          id: 1,
          user_id: 1,
          ...budgetData,
          created_at: new Date(),
        };
    
        (db.query as jest.Mock).mockResolvedValueOnce({ rows: [insertedBudget] });
    
        const req = mockRequest(budgetData, { token: 'validtoken' });
        const res = mockResponse();
    
        await budgetController.createBudget(req, res);
    
        expect(db.query).toHaveBeenCalledWith(
            `INSERT INTO budget_table (user_id, name, amount, time, date) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [1, 'Groceries', 250.5, 'Monthly', '2025-04-01T00:00:00.000Z']
          );

        expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ status: 'success', data: insertedBudget });
  });

  it('should return 500 if database error occurs', async () => {
    (jwt.verify as jest.Mock).mockReturnValueOnce({ id: 1 });

    (db.query as jest.Mock).mockRejectedValueOnce(new Error('Database error'));

    const req = mockRequest({
      name: 'Groceries',
      amount: 100,
      time: 'Monthly',
      date: '2025-04-01',
    }, { token: 'validtoken' });

    const res = mockResponse();

    await budgetController.createBudget(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Error saving budget', status: 'error' });
  });

  it('should return 401 if token is invalid', async () => {
    (jwt.verify as jest.Mock).mockImplementation(() => {
      throw new Error('Invalid token');
    });

    const req = mockRequest({
      name: 'Groceries',
      amount: 100,
      time: 'Monthly',
      date: '2025-04-01',
    }, { token: 'invalidtoken' });

    const res = mockResponse();

    await budgetController.createBudget(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Unauthorized: Please log in', status: 'error' });
  });
});

describe('getBudget', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });
  
    it('should return 401 if no token is provided', async () => {
      const req = mockRequest({}, {}); // no cookies
      const res = mockResponse();
  
      await budgetController.getBudget(req, res);
  
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Unauthorized: Please log in', status: 'error' });
    });
  
    it('should return 401 if token is invalid', async () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });
  
      const req = mockRequest({}, { token: 'invalidtoken' });
      const res = mockResponse();
  
      await budgetController.getBudget(req, res);
  
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Unauthorized: Please log in', status: 'error' });
    });
  
    it('should return 200 with budgets if query is successful', async () => {
      (jwt.verify as jest.Mock).mockReturnValueOnce({ id: 1 });
  
      const budgets = [
        { id: 1, user_id: 1, name: 'Rent', amount: 1200, time: 'Monthly', date: '2025-04-01', created_at: new Date() },
      ];
  
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: budgets });
  
      const req = mockRequest({}, { token: 'validtoken' });
      const res = mockResponse();
  
      await budgetController.getBudget(req, res);
  
      expect(db.query).toHaveBeenCalledWith('SELECT * FROM budget_table WHERE user_id = $1', [1]);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ status: 'success', data: budgets });
    });
  
    it('should return 500 if database query fails', async () => {
      (jwt.verify as jest.Mock).mockReturnValueOnce({ id: 1 });
  
      (db.query as jest.Mock).mockRejectedValueOnce(new Error('DB error'));
  
      const req = mockRequest({}, { token: 'validtoken' });
      const res = mockResponse();
  
      await budgetController.getBudget(req, res);
  
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Error retrieving budgets', status: 'error' });
    });
  });

  describe('deleteBudget', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });
  
    it('should return 401 if no token is provided', async () => {
      const req = mockRequest({ id: '1' }); // no cookies
      const res = mockResponse();
  
      await budgetController.deleteBudget(req, res);
  
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Unauthorized: Please log in', status: 'error' });
    });
  
    it('should return 401 if token is invalid', async () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });
  
      const req = mockRequest({ id: '1' }, { token: 'invalidtoken' });
      const res = mockResponse();
  
      await budgetController.deleteBudget(req, res);
  
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Unauthorized: Please log in', status: 'error' });
    });
  
    it('should return 404 if no budget is found or unauthorized', async () => {
      (jwt.verify as jest.Mock).mockReturnValueOnce({ id: 1 });
  
      (db.query as jest.Mock).mockResolvedValueOnce({ rowCount: 0 });
  
      const req = mockRequest({}, { token: 'validtoken' }, { id: '999' });
      const res = mockResponse();
  
      await budgetController.deleteBudget(req, res);
  
      expect(db.query).toHaveBeenCalledWith(
        'DELETE FROM budget_table WHERE id = $1 AND user_id = $2 RETURNING *',
        [999, 1]
      );
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Budget not found or unauthorized', status: 'error' });
    });
  
    it('should return 200 if budget is successfully deleted', async () => {
        (jwt.verify as jest.Mock).mockReturnValueOnce({ id: 1 });
      
        (db.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1 });
      
        const req = mockRequest({}, { token: 'validtoken' }, { id: '2' }); // Make sure id is a string
        const res = mockResponse();
      
        await budgetController.deleteBudget(req, res);
      
        expect(db.query).toHaveBeenCalledWith(
          'DELETE FROM budget_table WHERE id = $1 AND user_id = $2 RETURNING *',
          [2, 1]
        );
      
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ data: 'Budget deleted successfully', status: 'success' });
      });
  
    it('should return 500 if database throws an error', async () => {
        (jwt.verify as jest.Mock).mockReturnValueOnce({ id: 1 });
    
        (db.query as jest.Mock).mockRejectedValueOnce(new Error('DB error'));
    
        const req = mockRequest({}, { token: 'validtoken' }, { id: '1' });
        const res = mockResponse();
    
        await budgetController.deleteBudget(req, res);
    
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: 'Error deleting budget', status: 'error' });
      });
  });

  describe('updateBudget', () => {

    beforeEach(() => {
        jest.clearAllMocks();
      });

      it('should return 401 if user is not authenticated', async () => {
        (jwt.verify as jest.Mock).mockImplementationOnce(() => {
          throw new Error('Invalid token');
        });
    
        const req = mockRequest({ id: '1' }, { token: 'invalidtoken' });
        const res = mockResponse();
    
        await budgetController.updateBudget(req, res);
    
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: 'Unauthorized: Please log in', status: 'error' });
      });

      it('should return 400 if budget ID is invalid', async () => {
        (jwt.verify as jest.Mock).mockReturnValueOnce({ id: 1 });
    
        const req = mockRequest({ id: '1' }, { token: 'invalidtoken' });
        const res = mockResponse();

        await budgetController.updateBudget(req, res);
    
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'Invalid budget ID', status: 'error' });
      });

      it('should return 400 if request body is invalid', async () => {
        (jwt.verify as jest.Mock).mockReturnValueOnce({ id: 1 });
    
        const req = mockRequest(
          { name: '', amount: '', time: '', date: '' }, // invalid body
          { token: 'validtoken' },
          { id: '1' }
        );
        const res = mockResponse();
    
        await budgetController.updateBudget(req, res);
    
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          message: 'Please ensure all fields are filled out correctly', status: 'error',
        });
      });
    
      it('should return 404 if no matching budget is found or user is unauthorized', async () => {
        (jwt.verify as jest.Mock).mockReturnValueOnce({ id: 1 });
    
        const req = mockRequest(
          { name: 'Bills', amount: 200, time: 'Monthly', date: '2024-01-01' },
          { token: 'validtoken' },
          { id: '999' }
        );
        const res = mockResponse();
    
        (db.query as jest.Mock).mockResolvedValueOnce({ rowCount: 0, rows: [] });
    
        await budgetController.updateBudget(req, res);
    
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: 'Budget not found or unauthorized', status: 'error' });
      });
    
      it('should return 200 and updated budget if successful', async () => {
        (jwt.verify as jest.Mock).mockReturnValueOnce({ id: 1 });
    
        const updatedBudget = {
          id: 2,
          name: 'Bills',
          amount: 200,
          time: 'Monthly',
          date: '2024-01-01',
          user_id: 1,
        };
    
        const req = mockRequest(
          {
            name: 'Bills',
            amount: 200,
            time: 'Monthly',
            date: '2024-01-01',
          },
          { token: 'validtoken' },
          { id: '2' }
        );
        const res = mockResponse();
    
        (db.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1, rows: [updatedBudget] });
    
        await budgetController.updateBudget(req, res);
    
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({data: updatedBudget, status: 'success'});
      });
    
      it('should return 500 on database error', async () => {
        (jwt.verify as jest.Mock).mockReturnValueOnce({ id: 1 });
    
        const req = mockRequest(
          {
            name: 'Bills',
            amount: 200,
            time: 'Monthly',
            date: '2024-01-01',
          },
          { token: 'validtoken' },
          { id: '2' }
        );
        const res = mockResponse();
    
        (db.query as jest.Mock).mockResolvedValueOnce(new Error('DB Error'));
    
        await budgetController.updateBudget(req, res);
    
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: 'Error updating budget', status: 'error' });
      });
  })


