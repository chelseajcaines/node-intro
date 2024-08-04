import { Request, Response } from 'express';
import * as rest from '../utils/rest';
import Joi from 'joi';
import pool from '../db';

type amount = number;

export interface Income {
  id?: number;
  source: string;
  amount: amount;
}

const IncomeSchema = Joi.object<Income>({
  id: Joi.number().optional(),
  source: Joi.string().required(),
  amount: Joi.number().required(),
});

export const createIncome = async (req: Request, res: Response) => {
  const { error, value } = IncomeSchema.validate(req.body);
  if (error !== undefined) {
    return res.status(400).json(rest.error('Income data is not formatted correctly'));
  }

  const income = value;
  if ('id' in income) {
    return res.status(400).json(rest.error('Income ID will be generated automatically'));
  }

  try {
    const result = await pool.query(
      'INSERT INTO income (source, amount) VALUES ($1, $2) RETURNING *',
      [income.source, income.amount]
    );
    return res.status(200).json(rest.success(result.rows[0]));
  } catch (err) {
    console.error('Error creating income:', err);
    return res.status(500).json(rest.error('Error creating income'));
  }
};

export const getIncome = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json(rest.error('Invalid income ID'));
  }

  try {
    const result = await pool.query('SELECT * FROM income WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json(rest.error('Income not found'));
    }
    return res.status(200).json(rest.success(result.rows[0]));
  } catch (err) {
    console.error('Error retrieving income:', err);
    return res.status(500).json(rest.error('Error retrieving income'));
  }
};

export const updateIncome = async (req: Request, res: Response) => {
  const { error, value } = IncomeSchema.validate(req.body);
  if (error !== undefined) {
    return res.status(400).json(rest.error('Income data is not formatted correctly'));
  }

  const id = parseInt(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json(rest.error('Invalid income ID'));
  }

  try {
    const result = await pool.query(
      'UPDATE income SET source = $1, amount = $2 WHERE id = $3 RETURNING *',
      [value.source, value.amount, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json(rest.error('Income not found'));
    }
    return res.status(200).json(rest.success(result.rows[0]));
  } catch (err) {
    console.error('Error updating income:', err);
    return res.status(500).json(rest.error('Error updating income'));
  }
};

export const deleteIncome = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json(rest.error('Invalid income ID'));
  }

  try {
    const result = await pool.query('DELETE FROM income WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json(rest.error('Income not found'));
    }
    return res.status(200).json(rest.success({ message: 'Income deleted successfully' }));
  } catch (err) {
    console.error('Error deleting income:', err);
    return res.status(500).json(rest.error('Error deleting income'));
  }
};

