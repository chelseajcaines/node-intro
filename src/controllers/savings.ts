import { Request, Response } from 'express';
import * as rest from '../utils/rest';
import Joi from 'joi';
import pool from '../db';

export interface Saving {
  id?: number;
  name: string;
  amount: number;
  deposit_amount: number;
  time: string;
  date: string;
  created_at?: Date;
}

const SavingSchema = Joi.object<Saving>({
  name: Joi.string().min(1).max(255).required(),
  amount: Joi.number().positive().precision(2).required(),
  deposit_amount: Joi.number().positive().precision(2).required(),
  time: Joi.string().valid('Daily', 'Weekly', 'Bi-Weekly', 'Monthly', 'Yearly').required(),
  date: Joi.string().isoDate().required(),
});

export const createSaving = async (req: Request, res: Response) => {
    console.log('Incoming request body:', req.body); // Log the incoming request body
  
    // Validate request body
    const { error, value } = SavingSchema.validate(req.body);
    if (error) {
        console.error('Validation error:', error.details);
        return res.status(400).json(rest.error('Please ensure all fields are filled out correctly'));
    }
  
    const { name, amount, deposit_amount, time, date } = value;
  
    try {
        
        const result = await pool.query(
            `INSERT INTO savings_table (name, amount, deposit_amount, time, date) VALUES ($1, $2, $3, $4, $5::DATE) RETURNING *`,
            [name, amount, deposit_amount, time, date]
        );
  
        return res.status(201).json(rest.success(result.rows[0]));
    } catch (err) {
        console.error('Error saving saving:', err);
        return res.status(500).json(rest.error('Error saving saving'));
    }
  };