import { Router } from 'express';
import { misService } from './mis.service.js';
import { crudController } from '../../common/crud.controller.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { protect, restrictTo } from '../../middleware/auth.js';

const router = Router();
const c = crudController(misService);

router.use(protect);

// Aggregate statistics
router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    const stats = await misService.getStats(req.query);
    res.json({ success: true, data: stats });
  })
);

// Standard CRUD
router.get('/', c.list);
router.post('/', restrictTo('admin', 'manager'), c.create);
router.get('/:id', c.get);
router.put('/:id', restrictTo('admin', 'manager'), c.update);
router.delete('/:id', restrictTo('admin'), c.remove);

// Executive Sign-Off
router.post(
  '/:id/approve',
  restrictTo('admin', 'manager'),
  asyncHandler(async (req, res) => {
    const updated = await misService.approveScore(req.user, req.params.id, req.body);
    res.json({ success: true, data: updated });
  })
);

export default router;
