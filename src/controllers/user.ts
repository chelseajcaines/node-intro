import { Request, Response } from 'express';
import * as rest from '../utils/rest';
import Joi from 'joi';
import pool from '../db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

type email = string;

export interface User {
  id?: number;
  name: string;
  email: email;
  password_hash?: string;
  password?: string;
}

const UserSchema = Joi.object<User>({
  id: Joi.number().optional(),
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  password_hash: Joi.string().optional(),
  password: Joi.string().min(6).required(), // Require password and set a minimum length
});

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export const loginUser = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  // Validate email format first
  const emailSchema = Joi.string().email().required();
  const { error } = emailSchema.validate(email);
  if (error) {
    return res.status(400).json(rest.error('Invalid email format'));
  }

  if (!email || !password) {
    return res.status(400).json(rest.error('Email and password are required'));
  }

  try {
    const result = await pool.query('SELECT * FROM user_table WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      return res.status(404).json(rest.error('User not found'));
    }

    const user = result.rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json(rest.error('Invalid email or password'));
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });
    res.cookie('token', token, { httpOnly: true });

    return res.status(200).json({ serviceToken: token, user: { id: user.id, email: user.email } });
  } catch (err) {
    console.error('Error logging in user:', err);
    return res.status(500).json(rest.error('Error logging in user'));
  }
};

export const createUser = async (req: Request, res: Response) => {
  console.log('Incoming request body:', req.body); // Log the incoming request body
  const { error, value } = UserSchema.validate(req.body);
  
  if (error) {
    console.error('Validation error:', error.details); // Log the specific validation error
    return res.status(400).json(rest.error('Please ensure all fields are filled out correctly'));
  }

  const user = value;
  if ('id' in user) {
    return res.status(400).json(rest.error('User ID will be generated automatically'));
  }

  try {
    // Check if the email already exists
    const emailCheck = await pool.query('SELECT * FROM user_table WHERE email = $1', [user.email]);
    if (emailCheck.rows.length > 0) {
      return res.status(409).json(rest.error('Email is already in use'));
    }

    // Hash the password before storing it
    if (user.password === undefined) {
      return res.status(400).json(rest.error('password not in user'));
    }

    const hashedPassword = await bcrypt.hash(user.password, 10);

    const result = await pool.query(
      'INSERT INTO user_table (name, email, password_hash) VALUES ($1, $2, $3) RETURNING *',
      [user.name, user.email, hashedPassword]
    );
    const login = { email: result.rows[0].email, name: result.rows[0].name };

    return res.status(201).json(rest.success(login));
  } catch (err) {
    console.error('Error creating user:', err);
    return res.status(500).json(rest.error('Error creating user'));
  }
};

export const getUser = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);

  // First, validate if the user ID is a valid number
  if (Number.isNaN(id)) {
    return res.status(400).json(rest.error('Invalid user ID'));
  }

  try {
    // Query the database to see if the user exists
    const result = await pool.query('SELECT * FROM user_table WHERE id = $1', [id]);

    // If no user is found, return 404
    if (result.rows.length === 0) {
      return res.status(404).json(rest.error('User not found'));
    }

    const user = result.rows[0];

    // Compare the ID from the token with the requested user ID (for access control)
    if (req.user?.id !== id) {
      return res.status(403).json(rest.error('You do not have access to this user data'));
    }

    // If everything is valid, return the user data
    return res.status(200).json(rest.success(user));
  } catch (err) {
    console.error('Error retrieving user:', err);
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
    if (value.password === undefined){
      return res.status(400).json(rest.error('password not in user'));
    }
    // Hash the password before updating it
    const hashedPassword = await bcrypt.hash(value.password, 10);

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
