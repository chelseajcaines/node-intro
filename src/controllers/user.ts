import { Request, Response } from 'express';
import * as rest from '../utils/rest';
import Joi from 'joi';
import pool from '../db';

type email = string;

export interface User {
  id?: number;
  name: string;
  email: email;
}

const UserSchema = Joi.object<User>({
  id: Joi.number().optional(),
  name: Joi.string().required(),
  email: Joi.string().email().required(),
});

export const createUser = async (req: Request, res: Response) => {
    const { error, value } = UserSchema.validate(req.body);
    if (error !== undefined) {
      return res.status(400).json(rest.error('User data is not formatted correctly'));
    }
  
    const user = value;
    if ('id' in user) {
      return res.status(400).json(rest.error('User ID will be generated automatically'));
    }
  
    try {
      const result = await pool.query(
        'INSERT INTO newusers (name, email) VALUES ($1, $2) RETURNING *',
        [user.name, user.email]
      );
      return res.status(200).json(rest.success(result.rows[0]));
    } catch (err) {
      console.error('Error creating user:', err);
      return res.status(500).json(rest.error('Error creating user'));
    }
  };

export const getUser = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json(rest.error('Invalid user ID'));
  }

  try {
    const result = await pool.query('SELECT * FROM newusers WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json(rest.error('User not found'));
    }
    return res.status(200).json(rest.success(result.rows[0]));
  } catch (err) {
    return res.status(500).json(rest.error('Error retrieving user'));
  }
};

export const updateUser = async (req: Request, res: Response) => {
  const { error, value } = UserSchema.validate(req.body);
  if (error !== undefined) {
    return res.status(400).json(rest.error('User data is not formatted correctly'));
  }

  const id = parseInt(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json(rest.error('Invalid user ID'));
  }

  try {
    const result = await pool.query(
      'UPDATE newusers SET name = $1, email = $2 WHERE id = $3 RETURNING *',
      [value.name, value.email, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json(rest.error('User not found'));
    }
    return res.status(200).json(rest.success(result.rows[0]));
  } catch (err) {
    return res.status(500).json(rest.error('Error updating user'));
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json(rest.error('Invalid user ID'));
  }

  try {
    const result = await pool.query('DELETE FROM newusers WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json(rest.error('User not found'));
    }
    return res.status(200).json(rest.success({ message: 'User deleted successfully' }));
  } catch (err) {
    return res.status(500).json(rest.error('Error deleting user'));
  }
};