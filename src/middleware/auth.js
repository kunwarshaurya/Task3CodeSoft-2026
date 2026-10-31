import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import User from '../models/User.js';
import { AppError } from '../utils/AppError.js';

/**
 * Protect routes — verify JWT and attach user to req.
 */
export const protect = async (req, res, next) => {
  try {
    let token;

    // Extract token from Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw new AppError('Not authorized — no token provided', 401);
    }

    // Verify token
    const decoded = jwt.verify(token, config.jwt.secret);

    // Find user and ensure they still exist
    const user = await User.findById(decoded.id);
    if (!user) {
      throw new AppError('User belonging to this token no longer exists', 401);
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(new AppError('Invalid token', 401));
    }
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Token has expired', 401));
    }
    next(error);
  }
};
