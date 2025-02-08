import { Request, Response } from 'express';
import * as rest from '../utils/rest';
import Joi from 'joi';
import pool from '../db';

export interface Expense {
    id?: number;
    category: string;
    location: string;
    amount: number;
    date: string;
    payment: string;
    deduction: string;
    created_at?: Date;
}

const ExpenseSchema = Joi.object<Expense>({
  category: Joi.string().min(1).max(255).required(),
  location: Joi.string().min(1).max(255).required(),
  amount: Joi.number().positive().precision(2).required(),
  date: Joi.string().isoDate().required(),
  payment: Joi.string().valid('Credit', 'Debit', 'Cash').required(),
  deduction: Joi.string().valid('None').required()
});

export const createExpense = async (req: Request, res: Response) => {
    console.log('Incoming request body:', req.body); // Log the incoming request body
  
    // Validate request body
    const { error, value } = ExpenseSchema.validate(req.body);
    if (error) {
        console.error('Validation error:', error.details);
        return res.status(400).json(rest.error('Please ensure all fields are filled out correctly'));
    }
  
    const { category, location, amount, date, payment, deduction } = value;
  
    try {
        // Insert into the budget_table
        const result = await pool.query(
            `INSERT INTO expense_table (category, location, amount, date, payment, deduction) VALUES ($1, $2, $3, $4::DATE, $5, $6) RETURNING *`,
            [category, location, amount, date, payment, deduction]
        );
  
        return res.status(201).json(rest.success(result.rows[0]));
    } catch (err) {
        console.error('Error saving expense:', err);
        return res.status(500).json(rest.error('Error saving expense'));
    }
  };