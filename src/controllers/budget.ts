import { Request, Response } from 'express';
import * as rest from '../utils/rest';
import Joi from 'joi';
import pool from '../db';

type amount = string;

export interface Budget {
  id?: number;
  name: string;
  amount: amount;
}

const BudgetSchema = Joi.object<Budget>({
  id: Joi.number().optional(),
  name: Joi.string().required(),
  amount: Joi.string().required(),
});

export const createBudget = async (req: Request, res: Response) => {
  const { error, value } = BudgetSchema.validate(req.body);
  if (error !== undefined) {
    return res.status(400).json(rest.error('Budget data is not formatted correctly'));
  }

  const budget = value;
  if ('id' in budget) {
    return res.status(400).json(rest.error('Budget ID will be generated automatically'));
  }

  try {
    const result = await pool.query(
      'INSERT INTO budgets (name, amount) VALUES ($1, $2) RETURNING *',
      [budget.name, budget.amount]
    );
    return res.status(200).json(rest.success(result.rows[0]));
  } catch (err) {
    console.error('Error creating budget:', err);
    return res.status(500).json(rest.error('Error creating budget'));
  }
};

export const getBudget = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json(rest.error('Invalid budget ID'));
  }

  try {
    const result = await pool.query('SELECT * FROM budgets WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json(rest.error('Budget not found'));
    }
    return res.status(200).json(rest.success(result.rows[0]));
  } catch (err) {
    console.error('Error retrieving budget:', err);
    return res.status(500).json(rest.error('Error retrieving budget'));
  }
};

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
      'UPDATE budgets SET name = $1, amount = $2 WHERE id = $3 RETURNING *',
      [value.name, value.amount, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json(rest.error('Budget not found'));
    }
    return res.status(200).json(rest.success(result.rows[0]));
  } catch (err) {
    console.error('Error updating budget:', err);
    return res.status(500).json(rest.error('Error updating budget'));
  }
};

export const deleteBudget = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json(rest.error('Invalid budget ID'));
  }

  try {
    const result = await pool.query('DELETE FROM budgets WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json(rest.error('Budget not found'));
    }
    return res.status(200).json(rest.success({ message: 'Budget deleted successfully' }));
  } catch (err) {
    console.error('Error deleting budget:', err);
    return res.status(500).json(rest.error('Error deleting budget'));
  }
};