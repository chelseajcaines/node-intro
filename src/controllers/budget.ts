import { Request, Response } from 'express';
import * as rest from '../utils/rest';
import Joi from 'joi';
import pool from '../db';
import jwt from 'jsonwebtoken';

// Define the Budget interface
export interface Budget {
    id?: number;
    user_id: number;
    name: string;
    amount: number;
    time: string;
    date: string;
    created_at?: Date;
}

// Budget Schema Validation
const BudgetSchema = Joi.object({
    name: Joi.string().min(1).max(255).required(),
    amount: Joi.number().positive().precision(2).required(),
    time: Joi.string().valid('Daily', 'Weekly', 'Monthly', 'Yearly').required(),
    date: Joi.string().isoDate().required(),
});

const getUserIdFromToken = (req: Request): number | null => {
    const token = req.cookies.token;
    if (!token) return null;
    try {
        const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        console.log('Decoded token:', decoded);
        return decoded.id;
    } catch (error) {
        console.error('Token verification error:', error);
        return null;
    }
};

// Create a new budget
export const createBudget = async (req: Request, res: Response) => {
    const userId = getUserIdFromToken(req);
    if (!userId) {
        return res.status(401).json(rest.error('Unauthorized: Please log in'));
    }

    const { error, value } = BudgetSchema.validate(req.body);
    if (error) {
        return res.status(400).json(rest.error('Invalid budget data'));
    }

    const { name, amount, time, date } = value;

    try {
        const result = await pool.query(
            `INSERT INTO budget_table (user_id, name, amount, time, date) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [userId, name, amount, time, date]
        );
        return res.status(201).json(rest.success(result.rows[0]));
    } catch (err) {
        console.error('Error saving budget:', err);
        return res.status(500).json(rest.error('Error saving budget'));
    }
};

// Get budgets for the logged-in user
export const getBudget = async (req: Request, res: Response) => {
    const userId = getUserIdFromToken(req);
    if (!userId) {
        return res.status(401).json(rest.error('Unauthorized: Please log in'));
    }

    try {
        const result = await pool.query('SELECT * FROM budget_table WHERE user_id = $1', [userId]);
        return res.status(200).json(rest.success(result.rows));
    } catch (err) {
        console.error('Error retrieving budgets:', err);
        return res.status(500).json(rest.error('Error retrieving budgets'));
    }
};

export const deleteBudget = async (req: Request, res: Response) => {
    const userId = getUserIdFromToken(req);
    if (!userId) {
        return res.status(401).json(rest.error('Unauthorized: Please log in'));
    }

    const budgetId = parseInt(req.params.id); // Get the budgetId from the route parameter

    try {
        // Update the query to check both the user_id and the budget_id
        const result = await pool.query(
            'DELETE FROM budget_table WHERE id = $1 AND user_id = $2 RETURNING *',
            [budgetId, userId]
        );

        // If no rows were deleted, it means the budget was not found or doesn't belong to the user
        if (result.rowCount === 0) {
            console.log(`No budget found for userId ${userId} and budgetId ${budgetId}`);
            return res.status(404).json(rest.error('Budget not found or unauthorized'));
        }

        return res.status(200).json(rest.success('Budget deleted successfully'));
    } catch (err) {
        console.error('Error deleting budget:', err);
        return res.status(500).json(rest.error('Error deleting budget'));
    }
};

export const updateBudget = async (req: Request, res: Response) => {
    const userId = getUserIdFromToken(req);
    if (!userId) {
        return res.status(401).json(rest.error('Unauthorized: Please log in'));
    }

    const budgetId = parseInt(req.params.id);
    if (isNaN(budgetId)) {
        return res.status(400).json(rest.error('Invalid budget ID'));
    }

    // Validate incoming data
    const { error, value } = BudgetSchema.validate(req.body);
    if (error) {
        console.error('Validation error:', error.details);
        return res.status(400).json(rest.error('Please ensure all fields are filled out correctly'));
    }

    const { name, amount, time, date } = value;

    try {
        const result = await pool.query(
            `UPDATE budget_table
             SET name = $1,
                 amount = $2,
                 time = $3,
                 date = $4::DATE
             WHERE id = $5 AND user_id = $6
             RETURNING *`,
            [name, amount, time, date, budgetId, userId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json(rest.error('Budget not found or unauthorized'));
        }

        return res.status(200).json(rest.success(result.rows[0]));
    } catch (err) {
        console.error('Error updating budget:', err);
    return res.status(500).json(rest.error('Error updating budget'));
    }
};