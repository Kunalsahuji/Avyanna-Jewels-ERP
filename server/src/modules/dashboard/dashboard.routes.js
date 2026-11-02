import { Router } from 'express';
import { z } from 'zod';
import { protect } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { optionalObjectId } from '../../common/schemas.js';
import { getDashboard } from './dashboard.service.js';

const querySchema = z.object({
  days: z.coerce.number().int().min(1).max(120).default(30),
  userId: optionalObjectId,
});

const router = Router();
router.get('/', protect, validate({ query: querySchema }), asyncHandler(async (req, res) => {
  res.json({ success: true, data: await getDashboard(req.user, req.query) });
}));

export default router;
