import { Router } from 'express';
import { mastersService } from './masters.service.js';
import { crudController } from '../../common/crud.controller.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { protect, restrictTo } from '../../middleware/auth.js';

const router = Router();
const c = crudController(mastersService);

router.use(protect);

// Aggregate statistics
router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    const stats = await mastersService.getStats();
    res.json({ success: true, data: stats });
  })
);

// Standard CRUD
router.get('/', c.list);
router.post('/', restrictTo('admin', 'manager'), c.create);
router.get('/:id', c.get);
router.put('/:id', restrictTo('admin', 'manager'), c.update);
router.delete('/:id', restrictTo('admin'), c.remove);

// Toggle active status
router.post(
  '/:id/toggle-active',
  restrictTo('admin', 'manager'),
  asyncHandler(async (req, res) => {
    const updated = await mastersService.toggleActive(req.user, req.params.id);
    res.json({ success: true, data: updated });
  })
);

// Update bullion / purity rate
router.post(
  '/:id/update-rate',
  restrictTo('admin', 'manager'),
  asyncHandler(async (req, res) => {
    const updated = await mastersService.updateRate(req.user, req.params.id, req.body);
    res.json({ success: true, data: updated });
  })
);

export default router;
