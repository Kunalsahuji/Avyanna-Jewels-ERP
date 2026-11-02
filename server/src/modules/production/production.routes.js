import { Router } from 'express';
import { z } from 'zod';
import { protect, restrictTo } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { crudController } from '../../common/crud.controller.js';
import { idParam, objectId, optionalObjectId } from '../../common/schemas.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import {
  PRODUCTION_STAGES,
  JOB_PRIORITY,
  JEWELRY_CATEGORIES,
  PURITY_OPTIONS,
} from './production.model.js';
import { productionService as svc } from './production.service.js';

const createSchema = z.object({
  title: z.string().min(3).max(200),
  designCode: z.string().min(2).max(50),
  clientOrderNo: z.string().max(50).optional(),
  category: z.enum(JEWELRY_CATEGORIES).default('ring'),
  purity: z.enum(PURITY_OPTIONS).default('18K'),
  currentStage: z.enum(PRODUCTION_STAGES).default('cad_design'),
  priority: z.enum(JOB_PRIORITY).default('medium'),
  assignedKarigar: optionalObjectId,
  dueDate: z.coerce.date(),
  initialGoldWeight: z.coerce.number().positive(),
  currentGoldWeight: z.coerce.number().positive().optional(),
  totalDiamondsPieces: z.coerce.number().int().nonnegative().default(0),
  totalDiamondsCarat: z.coerce.number().nonnegative().default(0),
  huid: z.string().max(20).optional(),
  notes: z.string().max(1000).optional(),
});

const updateSchema = createSchema.partial();

const advanceSchema = z.object({
  nextStage: z.enum(PRODUCTION_STAGES),
  karigarId: optionalObjectId,
  returnedWeight: z.coerce.number().positive().optional(),
  notes: z.string().max(500).optional(),
});

const qcSchema = z.object({
  passed: z.boolean().default(true),
  findings: z.string().max(500).optional(),
  huidCode: z.string().max(20).optional(),
});

const c = crudController(svc);
const router = Router();
router.use(protect);

router.get('/', c.list);
router.get('/stats', c.stats);
router.get('/:id', validate({ params: idParam }), c.get);

router.post('/', restrictTo('admin', 'manager'), validate({ body: createSchema }), c.create);
router.patch('/:id', restrictTo('admin', 'manager'), validate({ params: idParam, body: updateSchema }), c.update);
router.delete('/:id', restrictTo('admin'), validate({ params: idParam }), c.remove);

router.post(
  '/:id/advance-stage',
  restrictTo('admin', 'manager'),
  validate({ params: idParam, body: advanceSchema }),
  asyncHandler(async (req, res) =>
    res.json({ success: true, data: await svc.advanceStage(req.user, req.params.id, req.body) })
  )
);

router.post(
  '/:id/qc-inspect',
  restrictTo('admin', 'manager'),
  validate({ params: idParam, body: qcSchema }),
  asyncHandler(async (req, res) =>
    res.json({ success: true, data: await svc.qcInspect(req.user, req.params.id, req.body) })
  )
);

export default router;
