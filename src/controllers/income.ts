import { Request, Response } from 'express';
import * as rest from '../utils/rest';
import Joi from 'joi';
import pool from '../db';

export interface Income {
  id?: number;
  name: string;
  amount: number;
  time: string;
  date: string;
  position: string;
  created_at?: Date;
}

const IncomeSchema = Joi.object<Income>({
  name: Joi.string().min(1).max(255).required(),
  amount: Joi.number().positive().precision(2).required(),
  time: Joi.string().valid('Weekly', 'Bi-Weekly', 'Monthly', 'Yearly').required(),
  date: Joi.string().isoDate().required(),
  position: Joi.string().valid('Full Time', 'Part Time', 'Casual', 'Side Job').required(),
});

export const createIncome = async (req: Request, res: Response) => {
  console.log('Incoming request body:', req.body); // Log the incoming request body

  // Validate request body
  const { error, value } = IncomeSchema.validate(req.body);
  if (error) {
      console.error('Validation error:', error.details);
      return res.status(400).json(rest.error('Please ensure all fields are filled out correctly'));
  }

  const { name, amount, time, date, position } = value;

  try {
      // Insert into the budget_table
      const result = await pool.query(
          `INSERT INTO income_table (name, amount, time, date, position) VALUES ($1, $2, $3, $4::DATE, $5) RETURNING *`,
          [name, amount, time, date, position]
      );

      return res.status(201).json(rest.success(result.rows[0]));
  } catch (err) {
      console.error('Error saving income:', err);
      return res.status(500).json(rest.error('Error saving income'));
  }
};

// export const getIncome = async (req: Request, res: Response) => {
//   const id = parseInt(req.params.id);
//   if (Number.isNaN(id)) {
//     return res.status(400).json(rest.error('Invalid income ID'));
//   }

//   try {
//     const result = await pool.query('SELECT * FROM income WHERE id = $1', [id]);
//     if (result.rows.length === 0) {
//       return res.status(404).json(rest.error('Income not found'));
//     }
//     return res.status(200).json(rest.success(result.rows[0]));
//   } catch (err) {
//     console.error('Error retrieving income:', err);
//     return res.status(500).json(rest.error('Error retrieving income'));
//   }
// };

// export const updateIncome = async (req: Request, res: Response) => {
//   const { error, value } = IncomeSchema.validate(req.body);
//   if (error !== undefined) {
//     return res.status(400).json(rest.error('Income data is not formatted correctly'));
//   }

//   const id = parseInt(req.params.id);
//   if (Number.isNaN(id)) {
//     return res.status(400).json(rest.error('Invalid income ID'));
//   }

//   try {
//     const result = await pool.query(
//       'UPDATE income SET source = $1, amount = $2 WHERE id = $3 RETURNING *',
//       [value.source, value.amount, id]
//     );
//     if (result.rows.length === 0) {
//       return res.status(404).json(rest.error('Income not found'));
//     }
//     return res.status(200).json(rest.success(result.rows[0]));
//   } catch (err) {
//     console.error('Error updating income:', err);
//     return res.status(500).json(rest.error('Error updating income'));
//   }
// };

// export const deleteIncome = async (req: Request, res: Response) => {
//   const id = parseInt(req.params.id);
//   if (Number.isNaN(id)) {
//     return res.status(400).json(rest.error('Invalid income ID'));
//   }

//   try {
//     const result = await pool.query('DELETE FROM income WHERE id = $1 RETURNING *', [id]);
//     if (result.rows.length === 0) {
//       return res.status(404).json(rest.error('Income not found'));
//     }
//     return res.status(200).json(rest.success({ message: 'Income deleted successfully' }));
//   } catch (err) {
//     console.error('Error deleting income:', err);
//     return res.status(500).json(rest.error('Error deleting income'));
//   }
// };

