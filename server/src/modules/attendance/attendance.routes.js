import { Router } from 'express';
import { attendanceService } from './attendance.service.js';
import { crudController } from '../../common/crud.controller.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { protect, restrictTo } from '../../middleware/auth.js';

const router = Router();
const c = crudController(attendanceService);

router.use(protect);

// Aggregate statistics
router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    const stats = await attendanceService.getStats();
    res.json({ success: true, data: stats });
  })
);

// Standard CRUD
router.get('/', c.list);
router.post('/', restrictTo('admin', 'manager'), c.create);
router.get('/:id', c.get);
router.put('/:id', restrictTo('admin', 'manager'), c.update);
router.delete('/:id', restrictTo('admin'), c.remove);

// Employee Biometric Punches
router.post(
  '/punch-in',
  asyncHandler(async (req, res) => {
    const record = await attendanceService.punchIn(req.user, req.body);
    res.json({ success: true, data: record });
  })
);

router.post(
  '/punch-out',
  asyncHandler(async (req, res) => {
    const record = await attendanceService.punchOut(req.user, req.body);
    res.json({ success: true, data: record });
  })
);

// Manager Regularization
router.post(
  '/:id/regularize',
  restrictTo('admin', 'manager'),
  asyncHandler(async (req, res) => {
    const updated = await attendanceService.regularize(req.user, req.params.id, req.body);
    res.json({ success: true, data: updated });
  })
);

export default router;
