import { Router } from 'express';
import { z } from 'zod';
import { protect, restrictTo } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { crudController } from '../../common/crud.controller.js';
import { idParam, objectId } from '../../common/schemas.js';
import { FREQUENCY, CATEGORY } from './checklist.model.js';
import { checklistService } from './checklist.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

const createSchema = z.object({
  description: z.string().min(3),
  assignedTo: objectId,
  plannedDate: z.coerce.date(),
  frequency: z.enum(FREQUENCY).default('daily'),
  repeatUntil: z.coerce.date().optional(),
  category: z.enum(CATEGORY).default('general'),
  proofRequired: z.boolean().default(false),
  mdRemark: z.string().optional(),
});

const updateSchema = createSchema.omit({ repeatUntil: true }).partial();

const completeSchema = z.object({
  remark: z.string().max(500).optional(),
  mdRemark: z.string().max(500).optional(),
  proofUrl: z.string().optional(),
  documentName: z.string().optional(),
});

const remarkSchema = z.object({
  mdRemark: z.string().max(1000),
});

const c = crudController(checklistService);
const router = Router();
router.use(protect);

router.get('/', c.list);
router.get('/stats', c.stats);
router.get(
  '/per-person',
  asyncHandler(async (req, res) => {
    const data = await checklistService.perPerson(req.user, req.query);
    res.json({ success: true, data });
  })
);

router.post('/', restrictTo('admin', 'manager'), validate({ body: createSchema }), c.create);
router.patch('/:id', restrictTo('admin', 'manager'), validate({ params: idParam, body: updateSchema }), c.update);
router.delete('/:id', restrictTo('admin'), validate({ params: idParam }), c.remove);
router.post('/:id/complete', validate({ params: idParam, body: completeSchema }), c.complete);

router.patch(
  '/:id/remark',
  validate({ params: idParam, body: remarkSchema }),
  asyncHandler(async (req, res) => {
    const doc = await checklistService.updateMdRemark(req.user, req.params.id, req.body.mdRemark);
    res.json({ success: true, data: doc });
  })
);

export default router;
