import { Request, Response } from 'express';
import * as rest from '../utils/rest';
import Joi from 'joi';
import pool from '../db';
import jwt from 'jsonwebtoken';

export interface Expense {
    id?: number;
    user_id: number;
    category: string;
    location: string;
    amount: number;
    date: string;
    payment: string;
    deduction: string;
    created_at?: Date;
}

const ExpenseSchema = Joi.object({
  category: Joi.string().min(1).max(255).required(),
  location: Joi.string().min(1).max(255).required(),
  amount: Joi.number().positive().precision(2).required(),
  date: Joi.string().isoDate().required(),
  payment: Joi.string().valid('Credit', 'Debit', 'Cash').required(),
  deduction: Joi.string().valid('None').required()
});

const getUserIdFromToken = (req: Request): number | null => {
    const token = req.cookies.token;
    if (!token) return null;
    try {
        const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        return decoded.id;
    } catch (error) {
        return null;
    }
};

export const createExpense = async (req: Request, res: Response) => {
    console.log('Incoming request body:', req.body); // Log the incoming request body

    const userId = getUserIdFromToken(req);
        if (!userId) {
            return res.status(401).json(rest.error('Unauthorized: Please log in'));
        }
  
    // Validate request body
    const { error, value } = ExpenseSchema.validate(req.body);
    if (error) {
        console.error('Validation error:', error.details);
        return res.status(400).json(rest.error('Please ensure all fields are filled out correctly'));
    }
  
    const { category, location, amount, date, payment, deduction } = value;
  
    try {
        // Insert into the expense_table
        const result = await pool.query(
            `INSERT INTO expense_table (user_id, category, location, amount, date, payment, deduction) VALUES ($1, $2, $3, $4, $5::DATE, $6, $7) RETURNING *`,
            [userId, category, location, amount, date, payment, deduction]
        );
  
        return res.status(201).json(rest.success(result.rows[0]));
    } catch (err) {
        console.error('Error saving expense:', err);
        return res.status(500).json(rest.error('Error saving expense'));
    }
  };

  // Get expenses for the logged-in user
export const getExpense = async (req: Request, res: Response) => {
    const userId = getUserIdFromToken(req);
    if (!userId) {
        return res.status(401).json(rest.error('Unauthorized: Please log in'));
    }

    try {
        const result = await pool.query('SELECT * FROM expense_table WHERE user_id = $1', [userId]);
        return res.status(200).json(rest.success(result.rows));
    } catch (err) {
        console.error('Error retrieving expense:', err);
        return res.status(500).json(rest.error('Error retrieving expense'));
    }
};

export const deleteExpense = async (req: Request, res: Response) => {
    const userId = getUserIdFromToken(req);
    if (!userId) {
        return res.status(401).json(rest.error('Unauthorized: Please log in'));
    }

    const expenseId = parseInt(req.params.id);

    try {
        // Update the query to check both the user_id and the budget_id
        const result = await pool.query(
            'DELETE FROM expense_table WHERE id = $1 AND user_id = $2 RETURNING *',
            [expenseId, userId]
        );

        // If no rows were deleted, it means the budget was not found or doesn't belong to the user
        if (result.rowCount === 0) {
            console.log(`No expense found for userId ${userId} and expenseId ${expenseId}`);
            return res.status(404).json(rest.error('Expense not found or unauthorized'));
        }

        return res.status(200).json(rest.success('Expense deleted successfully'));
    } catch (err) {
        console.error('Error deleting expense:', err);
        return res.status(500).json(rest.error('Error deleting expense'));
    }
};

export const updateExpense = async (req: Request, res: Response) => {
    const userId = getUserIdFromToken(req);
    if (!userId) {
        return res.status(401).json(rest.error('Unauthorized: Please log in'));
    }

    const expenseId = parseInt(req.params.id);
    if (isNaN(expenseId)) {
        return res.status(400).json(rest.error('Invalid expense ID'));
    }

    // Validate incoming data
    const { error, value } = ExpenseSchema.validate(req.body);
    if (error) {
        console.error('Validation error:', error.details);
        return res.status(400).json(rest.error('Please ensure all fields are filled out correctly'));
    }

    const { category, location, amount, date, payment, deduction } = value;

    try {
        const result = await pool.query(
            `UPDATE expense_table
             SET category = $1,
                 location = $2,
                 amount = $3,
                 date = $4::DATE,
                 payment = $5,
                 deduction = $6
             WHERE id = $7 AND user_id = $8
             RETURNING *`,
            [category, location, amount, date, payment, deduction, expenseId, userId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json(rest.error('Expense not found or unauthorized'));
        }

        return res.status(200).json(rest.success(result.rows[0]));
    } catch (err) {
        console.error('Error updating expense:', err);
        return res.status(500).json(rest.error('Error updating expense'));
    }
};