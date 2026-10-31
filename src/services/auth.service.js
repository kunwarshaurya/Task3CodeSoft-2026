import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import config from '../config/index.js';
import { AppError } from '../utils/AppError.js';

/**
 * Generate a JWT for the given user ID.
 */
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
};

/**
 * Register a new user.
 */
export const register = async ({ name, email, password }) => {
  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError('Email already registered', 409);
  }

  const user = await User.create({ name, email, password });
  const token = generateToken(user._id);

  return {
    user: user.toJSON(),
    token,
  };
};

/**
 * Authenticate a user and return a token.
 */
export const login = async ({ email, password }) => {
  // Find user with password included
  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new AppError('Invalid email or password', 401);
  }

  const token = generateToken(user._id);

  return {
    user: user.toJSON(),
    token,
  };
};

/**
 * Get current user profile.
 */
export const getMe = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }
  return user.toJSON();
};
