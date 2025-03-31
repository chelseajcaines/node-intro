import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import * as rest from '../utils/rest';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  console.log('Incoming Cookies:', req.cookies); // ✅ Log cookies

  const token = req.cookies?.token;

  if (!token) {
    console.log('No token found in cookies'); // ✅ Log if no token is found
    return res.status(401).json(rest.error('Token required for authentication'));
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      console.error('JWT Verification Error:', err); // ✅ Log any JWT errors
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json(rest.error('Token expired'));
      }
      return res.status(401).json(rest.error('Invalid token'));
    }

    console.log('Decoded User:', user); // ✅ Log decoded user from JWT
    req.user = user;
    next();
  });
};

