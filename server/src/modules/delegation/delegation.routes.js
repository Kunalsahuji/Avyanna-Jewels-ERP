import { Router } from 'express';
import { z } from 'zod';
import { protect, restrictTo } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { crudController } from '../../common/crud.controller.js';
import { idParam, objectId } from '../../common/schemas.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { PRIORITY, DELEGATION_STATUS } from './delegation.model.js';
import { delegationService as svc } from './delegation.service.js';

const createSchema = z.object({
  description: z.string().min(3),
  assignedTo: objectId,
  dueDate: z.coerce.date(),
  priority: z.enum(PRIORITY).default('medium'),
});

const updateSchema = createSchema.partial().extend({
  status: z.enum(DELEGATION_STATUS).optional(),
});

const shiftSchema = z.object({
  newDate: z.coerce.date(),
  reason: z.string().min(3).max(500),
});

const remarkSchema = z.object({
  text: z.string().min(1).max(1000),
});

const sendBackSchema = z.object({
  remark: z.string().max(500).optional(),
});

const c = crudController(svc);
const router = Router();
router.use(protect);

router.get('/', c.list);
router.get('/stats', c.stats);
router.post('/', validate({ body: createSchema }), c.create);
router.patch('/:id', restrictTo('admin', 'manager'), validate({ params: idParam, body: updateSchema }), c.update);
router.delete('/:id', restrictTo('admin'), validate({ params: idParam }), c.remove);
router.post('/:id/complete', validate({ params: idParam, body: sendBackSchema }), c.complete);

router.post(
  '/:id/approve',
  restrictTo('admin', 'manager'),
  validate({ params: idParam }),
  asyncHandler(async (req, res) => res.json({ success: true, data: await svc.approve(req.params.id) }))
);

router.post(
  '/:id/send-back',
  restrictTo('admin', 'manager'),
  validate({ params: idParam, body: sendBackSchema }),
  asyncHandler(async (req, res) => res.json({ success: true, data: await svc.sendBack(req.params.id, req.body.remark) }))
);

router.post(
  '/:id/shift',
  validate({ params: idParam, body: shiftSchema }),
  asyncHandler(async (req, res) =>
    res.json({ success: true, data: await svc.shiftDate(req.user, req.params.id, req.body) })
  )
);

router.post(
  '/:id/remarks',
  validate({ params: idParam, body: remarkSchema }),
  asyncHandler(async (req, res) =>
    res.json({ success: true, data: await svc.addRemark(req.user, req.params.id, req.body.text) })
  )
);

export default router;
