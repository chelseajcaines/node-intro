import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import * as rest from '../utils/rest';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json(rest.error('Token required for authentication'));
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json(rest.error('Token expired')); // Return 401 for expired tokens
      }
      return res.status(401).json(rest.error('Invalid token')); // Return 401 for invalid tokens
    }

    // Save the user data to the request object
    req.user = user;
    next();
  });
};

