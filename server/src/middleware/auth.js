import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../modules/users/user.model.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new AppError('Please sign in to continue', 401);

  const { id } = jwt.verify(token, env.jwtSecret);
  const user = await User.findById(id);
  if (!user || !user.isActive) throw new AppError('This account is no longer active', 401);

  req.user = user;
  next();
});

export const restrictTo = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : next(new AppError('You do not have permission to do that', 403));
