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
        return decoded.id;
    } catch (error) {
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

// export const createBudget = async (req: Request, res: Response) => {
//     const { error, value } = BudgetSchema.validate(req.body);
//     if (error) {
//         return res.status(400).json(rest.error('Budget data is not formatted correctly'));
//     }

//     const budget = value;

//     try {
//         const result = await pool.query(
//             'INSERT INTO budget_table (user_id, category_id, amount) VALUES ($1, $2, $3) RETURNING *',
//             [budget.user_id, budget.category_id, budget.amount]
//         );
        
//         // Convert amount to number before returning the response
//         const budgetData = result.rows[0];
//         budgetData.amount = parseFloat(budgetData.amount);

//         return res.status(201).json(rest.success(budgetData));
//     } catch (err) {
//         console.error('Error creating budget:', err);
//         return res.status(500).json(rest.error('Error creating budget'));
//     }
// };

// Get a budget by ID
// export const getBudget = async (req: Request, res: Response) => {
//     const id = parseInt(req.params.id);
//     if (isNaN(id)) {
//         return res.status(400).json(rest.error('Invalid budget ID'));
//     }

//     try {
//         const result = await pool.query('SELECT * FROM budget_table WHERE id = $1', [id]);
//         if (result.rows.length === 0) {
//             return res.status(404).json(rest.error('Budget not found'));
//         }
        
//         // Convert amount to number before returning the response
//         const budgetData = result.rows[0];
//         budgetData.amount = parseFloat(budgetData.amount);

//         return res.status(200).json(rest.success(budgetData));
//     } catch (err) {
//         console.error('Error retrieving budget:', err);
//         return res.status(500).json(rest.error('Error retrieving budget'));
//     }
// };

// Update a budget by ID
// export const updateBudget = async (req: Request, res: Response) => {
//     const { error, value } = BudgetSchema.validate(req.body);
//     if (error) {
//         return res.status(400).json(rest.error('Budget data is not formatted correctly'));
//     }

//     const id = parseInt(req.params.id);
//     if (isNaN(id)) {
//         return res.status(400).json(rest.error('Invalid budget ID'));
//     }

//     try {
//         const result = await pool.query(
//             'UPDATE budget_table SET user_id = $1, category_id = $2, amount = $3 WHERE id = $4 RETURNING *',
//             [value.user_id, value.category_id, value.amount, id]
//         );
//         if (result.rows.length === 0) {
//             return res.status(404).json(rest.error('Budget not found'));
//         }
//         return res.status(200).json(rest.success(result.rows[0]));
//     } catch (err) {
//         console.error('Error updating budget:', err);
//         return res.status(500).json(rest.error('Error updating budget'));
//     }
// };

// Delete a budget by ID
// export const deleteBudget = async (req: Request, res: Response) => {
//     const id = parseInt(req.params.id);
//     if (isNaN(id)) {
//         return res.status(400).json(rest.error('Invalid budget ID'));
//     }

//     try {
//         const result = await pool.query('DELETE FROM budget_table WHERE id = $1 RETURNING *', [id]);
//         if (result.rows.length === 0) {
//             return res.status(404).json(rest.error('Budget not found'));
//         }
//         return res.status(200).json(rest.success({ message: 'Budget deleted successfully' }));
//     } catch (err) {
//         console.error('Error deleting budget:', err);
//         return res.status(500).json(rest.error('Error deleting budget'));
//     }
// };