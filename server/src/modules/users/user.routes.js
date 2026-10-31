import { Router } from 'express';
import { protect, restrictTo } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { idParam } from '../../common/schemas.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { AppError } from '../../utils/AppError.js';
import { User } from './user.model.js';
import { createUserSchema, updateUserSchema } from './user.validation.js';

const router = Router();
router.use(protect);

// Everyone signed in can read the directory (needed for assignee pickers).
router.get('/', asyncHandler(async (req, res) => {
  const filter = req.query.all === 'true' && req.user.role === 'admin' ? {} : { isActive: true };
  res.json({ success: true, data: await User.find(filter).sort('name') });
}));

router.post('/', restrictTo('admin'), validate({ body: createUserSchema }), asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, data: await User.create(req.body) });
}));

router.patch('/:id', restrictTo('admin'), validate({ params: idParam, body: updateUserSchema }), asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError('User not found', 404);
  Object.assign(user, req.body); // save() so the password hook runs
  await user.save();
  res.json({ success: true, data: user });
}));

export default router;
