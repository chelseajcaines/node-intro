import { Request, Response } from 'express';
import * as rest from '../utils/rest';
import Joi from 'joi';
import pool from '../db';

// Define the Budget interface
export interface Budget {
    id?: number;  // Optional since it's auto-generated in PostgreSQL
    // user_id: number; // Assuming each budget belongs to a user
    name: string;
    amount: number;
    time: string;
    date: string;
    created_at?: Date; // Optional, defaulted in DB
}

// Define the validation schema for Budget
const BudgetSchema = Joi.object<Budget>({
    name: Joi.string().min(1).max(255).required(),
    amount: Joi.number().positive().precision(2).required(),
    time: Joi.string().valid('Daily', 'Weekly', 'Monthly', 'Yearly').required(),
    date: Joi.string().isoDate().required(), // Ensure it's a valid date string (YYYY-MM-DD)
    // user_id: Joi.number().integer().required() // Required to associate with a user
});

// Create a new budget

export const createBudget = async (req: Request, res: Response) => {
    console.log('Incoming request body:', req.body); // Log the incoming request body

    // Validate request body
    const { error, value } = BudgetSchema.validate(req.body);
    if (error) {
        console.error('Validation error:', error.details);
        return res.status(400).json(rest.error('Please ensure all fields are filled out correctly'));
    }

    const { name, amount, time, date } = value;

    try {
        // Insert into the budget_table
        const result = await pool.query(
            `INSERT INTO budget_table (name, amount, time, date) VALUES ($1, $2, $3, $4) RETURNING *`,
            [name, amount, time, date]
        );

        return res.status(201).json(rest.success(result.rows[0]));
    } catch (err) {
        console.error('Error saving budget:', err);
        return res.status(500).json(rest.error('Error saving budget'));
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