import { Request, Response } from 'express';
import * as rest from '../utils/rest';
import Joi from 'joi';
import pool from '../db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dns from 'dns/promises';

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
    // Step 1: Check if the user exists
    const result = await pool.query('SELECT * FROM user_table WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      return res.status(404).json(rest.error('User not found'));
    }

    const user = result.rows[0];

    // Step 2: Validate password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json(rest.error('Invalid email or password'));
    }

    // Step 3: Generate the JWT token
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });

    // Step 4: Store the token in the database
    await pool.query('UPDATE user_table SET session_token = $1 WHERE id = $2', [token, user.id]);

    // Step 5: Send the token as an HTTP-only cookie
    res.cookie('token', token, { httpOnly: true, secure: false, maxAge: 3600000, sameSite: 'lax' }); // 1 hour expiry

    // Return response with the user info and token (if needed)
    return res.status(200).json({ serviceToken: token, user: { id: user.id, email: user.email } });
  } catch (err) {
    console.error('Error logging in user:', err);
    return res.status(500).json(rest.error('Error logging in user'));
  }
};

// **Validate Session Function** (the new function)
export const validateUser = async (req: Request, res: Response) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ message: 'No token found, please log in' });
  }

  try {
    // Step 1: Decode the token to get the user ID
    const decoded: any = jwt.verify(token, JWT_SECRET);
    const userId = decoded.id;

    // Step 2: Retrieve the user from the database using the user ID
    const result = await pool.query('SELECT * FROM user_table WHERE id = $1', [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = result.rows[0];

    // Step 3: Check if the token stored in the database matches the one from the request
    if (user.session_token !== token) {
      return res.status(401).json({ message: 'Token mismatch, please log in again' });
    }

    // If token is valid, send back the user data
    return res.status(200).json({ user: { id: user.id, email: user.email, name: user.name } });
  } catch (error) {
    console.error('Error validating session:', error);
    return res.status(500).json({ message: 'Failed to validate session' });
  }
};

export const logoutUser = async (req: Request, res: Response) => {
  const token = req.cookies.token;
  if (!token) {
      return res.status(400).json({ message: 'No token provided' });
  }

  try {
      // Decode the token to find the user
      const decoded: any = jwt.verify(token, JWT_SECRET);
      const userId = decoded.id;

      // Remove the token from the database
      await pool.query('UPDATE user_table SET session_token = NULL WHERE id = $1', [userId]);

      // Clear the cookie
      res.clearCookie('token', { httpOnly: true, secure: false, sameSite: 'lax' });

      return res.status(200).json({ message: 'Logout successful' });
  } catch (error) {
      console.error('Error logging out:', error);
      return res.status(500).json({ message: 'Failed to log out' });
  }
};

export const createUser = async (req: Request, res: Response) => {
  console.log('Incoming request body:', req.body);
  const { error, value } = UserSchema.validate(req.body);

  if (error) {
    console.error('Validation error:', error.details);
    return res.status(400).json(rest.error('Please ensure all fields are filled out correctly'));
  }

  const user = value;

  if ('id' in user) {
    return res.status(400).json(rest.error('User ID will be generated automatically'));
  }

  // ✅ Email format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(user.email)) {
    return res.status(400).json(rest.error('Invalid email format.'));
  }

  // ✅ MX record check for email domain
  const domain = user.email.split('@')[1];
  try {
    const mxRecords = await dns.resolveMx(domain);
    if (!mxRecords || mxRecords.length === 0) {
      return res.status(400).json(rest.error('Email domain is not accepting mail.'));
    }
  } catch (err) {
    console.error('DNS MX lookup failed:', err);
    return res.status(400).json(rest.error('Invalid email domain.'));
  }

  try {
    // Check if the email already exists
    const emailCheck = await pool.query('SELECT * FROM user_table WHERE email = $1', [user.email]);
    if (emailCheck.rows.length > 0) {
      return res.status(409).json(rest.error('An account with this email already exists.'));
    }

    if (user.password === undefined) {
      return res.status(400).json(rest.error('Password not provided'));
    }

    const hashedPassword = await bcrypt.hash(user.password, 10);

    const result = await pool.query(
      'INSERT INTO user_table (name, email, password_hash) VALUES ($1, $2, $3) RETURNING *',
      [user.name, user.email, hashedPassword]
    );

    console.log('Insert result:', result.rows);

    // ✅ Fallback check for insert failure
    if (!result.rows || result.rows.length === 0) {
    console.error('Insert returned no rows.');
    return res.status(500).json(rest.error('User was not created'));
    }

    const login = { email: result.rows[0].email, name: result.rows[0].name };
    return res.status(201).json(rest.success(login));
  } catch (err) {
    console.error('Error creating user:', err);
    return res.status(500).json(rest.error('Error creating user'));
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
