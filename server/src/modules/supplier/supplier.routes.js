import { Router } from 'express';
import { supplierService } from './supplier.service.js';
import { crudController } from '../../common/crud.controller.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { protect, restrictTo } from '../../middleware/auth.js';

const router = Router();
const c = crudController(supplierService);

router.use(protect);

// Aggregate statistics
router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    const stats = await supplierService.getStats();
    res.json({ success: true, data: stats });
  })
);

// Standard CRUD
router.get('/', c.list);
router.post('/', restrictTo('admin', 'manager'), c.create);
router.get('/:id', c.get);
router.put('/:id', restrictTo('admin', 'manager'), c.update);
router.delete('/:id', restrictTo('admin'), c.remove);

// Inward Assay Testing
router.post(
  '/:id/assay',
  restrictTo('admin', 'manager', 'doer'),
  asyncHandler(async (req, res) => {
    const updated = await supplierService.receiveAndAssay(req.user, req.params.id, req.body);
    res.json({ success: true, data: updated });
  })
);

// Maker-checker Approval
router.post(
  '/:id/approve',
  restrictTo('admin', 'manager'),
  asyncHandler(async (req, res) => {
    const updated = await supplierService.approveOrder(req.user, req.params.id, req.body);
    res.json({ success: true, data: updated });
  })
);

// Rejection & Return
router.post(
  '/:id/reject',
  restrictTo('admin', 'manager'),
  asyncHandler(async (req, res) => {
    const updated = await supplierService.rejectOrder(req.user, req.params.id, req.body);
    res.json({ success: true, data: updated });
  })
);

export default router;
