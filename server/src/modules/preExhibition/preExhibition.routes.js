import { Router } from 'express';
import { preExhibitionService } from './preExhibition.service.js';
import { crudController } from '../../common/crud.controller.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { protect, restrictTo } from '../../middleware/auth.js';

const router = Router();
const c = crudController(preExhibitionService);

router.use(protect);

// Aggregate statistics
router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    const stats = await preExhibitionService.getStats();
    res.json({ success: true, data: stats });
  })
);

// Standard CRUD
router.get('/', c.list);
router.post('/', restrictTo('admin', 'manager'), c.create);
router.get('/:id', c.get);
router.put('/:id', restrictTo('admin', 'manager'), c.update);
router.delete('/:id', restrictTo('admin'), c.remove);

// Toggle checklist sub-item
router.post(
  '/:id/toggle-item',
  asyncHandler(async (req, res) => {
    const updated = await preExhibitionService.toggleChecklistItem(req.user, req.params.id, req.body);
    res.json({ success: true, data: updated });
  })
);

// Manager Sign-off
router.post(
  '/:id/sign-off',
  restrictTo('admin', 'manager'),
  asyncHandler(async (req, res) => {
    const updated = await preExhibitionService.signOffTask(req.user, req.params.id, req.body);
    res.json({ success: true, data: updated });
  })
);

export default router;
