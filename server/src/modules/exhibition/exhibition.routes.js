import { Router } from 'express';
import { exhibitionService } from './exhibition.service.js';
import { crudController } from '../../common/crud.controller.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { protect, restrictTo } from '../../middleware/auth.js';

const router = Router();
const c = crudController(exhibitionService);

router.use(protect);

// Aggregate statistics
router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    const stats = await exhibitionService.getStats();
    res.json({ success: true, data: stats });
  })
);

// Standard CRUD
router.get('/', c.list);
router.post('/', restrictTo('admin', 'manager'), c.create);
router.get('/:id', c.get);
router.put('/:id', restrictTo('admin', 'manager'), c.update);
router.delete('/:id', restrictTo('admin'), c.remove);

// Allocate stock to exhibition
router.post(
  '/:id/allocate-stock',
  restrictTo('admin', 'manager'),
  asyncHandler(async (req, res) => {
    const updated = await exhibitionService.allocateStock(req.user, req.params.id, req.body);
    res.json({ success: true, data: updated });
  })
);

// Record spot sale at event
router.post(
  '/:id/record-sale',
  restrictTo('admin', 'manager', 'doer'),
  asyncHandler(async (req, res) => {
    const updated = await exhibitionService.recordSale(req.user, req.params.id, req.body);
    res.json({ success: true, data: updated });
  })
);

// Reconcile unsold stock and close event
router.post(
  '/:id/reconcile',
  restrictTo('admin', 'manager'),
  asyncHandler(async (req, res) => {
    const updated = await exhibitionService.reconcileAndClose(req.user, req.params.id, req.body);
    res.json({ success: true, data: updated });
  })
);

export default router;
