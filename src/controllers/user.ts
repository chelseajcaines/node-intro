import { Request, Response } from 'express';
import * as rest from '../utils/rest';
import Joi from 'joi';
import pool from '../db';
import bcrypt from 'bcrypt';

type email = string;

export interface User {
  id?: number;
  name: string;
  email: email;
  password_hash: string;
}

const UserSchema = Joi.object<User>({
  id: Joi.number().optional(),
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  password_hash: Joi.string().required(),
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
    // Hash the password before storing it
    const hashedPassword = await bcrypt.hash(user.password_hash, 10);

    const result = await pool.query(
      'INSERT INTO user_table (name, email, password_hash) VALUES ($1, $2, $3) RETURNING *',
      [user.name, user.email, hashedPassword]
    );
    return res.status(201).json(rest.success(result.rows[0]));
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
    const result = await pool.query('SELECT * FROM user_table WHERE id = $1', [id]);
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
    // Hash the password before updating it
    const hashedPassword = await bcrypt.hash(value.password_hash, 10);

    const result = await pool.query(
      'UPDATE user_table SET name = $1, email = $2, password_hash = $3 WHERE id = $4 RETURNING *',
      [value.name, value.email, hashedPassword, id]
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
    const result = await pool.query('DELETE FROM user_table WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json(rest.error('User not found'));
    }
    return res.status(200).json(rest.success({ message: 'User deleted successfully' }));
  } catch (err) {
    return res.status(500).json(rest.error('Error deleting user'));
  }
};
