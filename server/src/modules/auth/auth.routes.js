import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { protect } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { AppError } from '../../utils/AppError.js';
import { User } from '../users/user.model.js';

const router = Router();
const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

router.post('/login', validate({ body: loginSchema }), asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email }).select('+password');
  // same message for both failures so accounts can't be enumerated
  if (!user || !user.isActive || !(await user.matchPassword(req.body.password))) {
    throw new AppError('Email or password is incorrect', 401);
  }
  const token = jwt.sign({ id: user._id }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
  res.json({ success: true, token, user });
}));

router.get('/me', protect, (req, res) => res.json({ success: true, user: req.user }));

export default router;
