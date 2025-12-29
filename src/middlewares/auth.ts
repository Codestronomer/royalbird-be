// src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import asyncHandler from './asyncHandler';
import ErrorResponse from '../utils/errorResponse';
import { User } from '../models/user.model';
import { Action } from 'routing-controllers';

interface AuthRequest extends Request {
  user?: any;
}

// Protect routes
export const protect = async (action: Action, roles: string[]) => {
  let token;

  // Check for token in headers
  if (action.request.headers.authorization && action.request.headers.authorization.startsWith('Bearer')) {
    token = action.request.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return false;
  }

  try {
    // Verify token
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);

    // Get user from token
    action.request.user = await User.findById(decoded.id).select('-password');

    if (!action.request.user) {
      return false;
    }

    return true;
  } catch (err) {
    return false;
  }
};

// Grant access to specific roles
export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new ErrorResponse(
          `User role ${req.user.role} is not authorized to access this route`,
          403
        )
      );
    }
    next();
  };
};