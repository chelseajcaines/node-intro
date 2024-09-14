import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import * as rest from '../utils/rest';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
//   const authHeader = req.headers['authorization'];
//   const token = authHeader && authHeader.split(' ')[1];
const token = req.cookies.token;

  if (!token) {
    return res.status(401).json(rest.error('Token required for authentication'));
  }

  jwt.verify(token, JWT_SECRET, (err:any, user:any) => {
    if (err) {
      return res.status(403).json(rest.error('Invalid or expired token'));
    }

    // Save the user data to the request object
    req.user = user;
    next();
  });
};