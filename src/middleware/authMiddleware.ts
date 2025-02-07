import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import * as rest from '../utils/rest';

const JWT_SECRET = process.env.JWT_SECRET as string;

// Extend Request type to include `user`
export interface AuthenticatedRequest extends Request {
  user?: { id: number }; // Ensure only `id` is stored
}

export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json(rest.error('Token required for authentication'));
  }

  jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json(rest.error('Token expired'));
      }
      return res.status(401).json(rest.error('Invalid token'));
    }

    // Ensure `decoded` contains `id`
    if (typeof decoded !== 'object' || !('id' in decoded)) {
      return res.status(401).json(rest.error('Invalid token payload'));
    }

    req.user = { id: decoded.id as number }; // Store only `id` in `req.user`
    next();
  });
};

