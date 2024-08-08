import { Request, Response } from 'express';
import * as rest from '../utils/rest';
import Joi from 'joi';
import pool from '../db';

// Define the Budget interface
export interface Budget {
    id?: number;
    user_id: number;
    category_id: number;
    amount: number;
    start_date: string;
    end_date: string;
}

// Define the validation schema for Budget
const BudgetSchema = Joi.object<Budget>({
    id: Joi.number().optional(),
    user_id: Joi.number().required(),
    category_id: Joi.number().required(),
    amount: Joi.number().precision(2).required(),
    start_date: Joi.date().iso().required(),
    end_date: Joi.date().iso().required(),
});

// Create a new budget
export const createBudget = async (req: Request, res: Response) => {
    const { error, value } = BudgetSchema.validate(req.body);
    if (error !== undefined) {
        return res.status(400).json(rest.error('Budget data is not formatted correctly'));
    }

    const budget = value;

    try {
        const result = await pool.query(
            'INSERT INTO budget (user_id, category_id, amount, start_date, end_date) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [budget.user_id, budget.category_id, budget.amount, budget.start_date, budget.end_date]
        );
        return res.status(201).json(rest.success(result.rows[0]));
    } catch (err) {
        console.error('Error creating budget:', err);
        return res.status(500).json(rest.error('Error creating budget'));
    }
};

// Get a budget by ID
export const getBudget = async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (Number.isNaN(id)) {
        return res.status(400).json(rest.error('Invalid budget ID'));
    }

    try {
        const result = await pool.query('SELECT * FROM budget WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json(rest.error('Budget not found'));
        }
        return res.status(200).json(rest.success(result.rows[0]));
    } catch (err) {
        return res.status(500).json(rest.error('Error retrieving budget'));
    }
};

// Update a budget by ID
export const updateBudget = async (req: Request, res: Response) => {
    const { error, value } = BudgetSchema.validate(req.body);
    if (error !== undefined) {
        return res.status(400).json(rest.error('Budget data is not formatted correctly'));
    }

    const id = parseInt(req.params.id);
    if (Number.isNaN(id)) {
        return res.status(400).json(rest.error('Invalid budget ID'));
    }

    try {
        const result = await pool.query(
            'UPDATE budget SET user_id = $1, category_id = $2, amount = $3, start_date = $4, end_date = $5 WHERE id = $6 RETURNING *',
            [value.user_id, value.category_id, value.amount, value.start_date, value.end_date, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json(rest.error('Budget not found'));
        }
        return res.status(200).json(rest.success(result.rows[0]));
    } catch (err) {
        return res.status(500).json(rest.error('Error updating budget'));
    }
};

// Delete a budget by ID
export const deleteBudget = async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (Number.isNaN(id)) {
        return res.status(400).json(rest.error('Invalid budget ID'));
    }

    try {
        const result = await pool.query('DELETE FROM budget WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json(rest.error('Budget not found'));
        }
        return res.status(200).json(rest.success({ message: 'Budget deleted successfully' }));
    } catch (err) {
        return res.status(500).json(rest.error('Error deleting budget'));
    }
};