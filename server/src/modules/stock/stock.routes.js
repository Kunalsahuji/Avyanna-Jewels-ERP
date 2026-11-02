import { Router } from 'express';
import { z } from 'zod';
import { protect, restrictTo } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { crudController } from '../../common/crud.controller.js';
import { idParam, objectId } from '../../common/schemas.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ITEM_TYPES, PURITY_OPTIONS, VAULT_LOCATIONS, STOCK_STATUS } from './stock.model.js';
import { stockService as svc } from './stock.service.js';

const createSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().optional(),
  itemType: z.enum(ITEM_TYPES),
  purity: z.enum(PURITY_OPTIONS).default('18K'),
  grossWeight: z.coerce.number().positive(),
  netWeight: z.coerce.number().positive(),
  diamondCarat: z.coerce.number().nonnegative().default(0),
  stonePieces: z.coerce.number().int().nonnegative().default(0),
  huid: z.string().max(20).optional(),
  location: z.enum(VAULT_LOCATIONS).default('Main Vault'),
  status: z.enum(STOCK_STATUS).default('in_stock'),
  valuation: z.coerce.number().nonnegative().default(0),
  costPrice: z.coerce.number().nonnegative().default(0),
  assignedTo: objectId.optional().nullable(),
});

const updateSchema = createSchema.partial();

const transferSchema = z.object({
  toLocation: z.enum(VAULT_LOCATIONS),
  remarks: z.string().max(500).optional(),
});

const issueSchema = z.object({
  karigarId: objectId,
  remarks: z.string().max(500).optional(),
});

const returnSchema = z.object({
  returnedWeight: z.coerce.number().positive().optional(),
  remarks: z.string().max(500).optional(),
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
  '/:id/transfer',
  restrictTo('admin', 'manager'),
  validate({ params: idParam, body: transferSchema }),
  asyncHandler(async (req, res) =>
    res.json({ success: true, data: await svc.transferLocation(req.user, req.params.id, req.body) })
  )
);

router.post(
  '/:id/issue-karigar',
  restrictTo('admin', 'manager'),
  validate({ params: idParam, body: issueSchema }),
  asyncHandler(async (req, res) =>
    res.json({ success: true, data: await svc.issueToKarigar(req.user, req.params.id, req.body) })
  )
);

router.post(
  '/:id/return-vault',
  restrictTo('admin', 'manager'),
  validate({ params: idParam, body: returnSchema }),
  asyncHandler(async (req, res) =>
    res.json({ success: true, data: await svc.returnToVault(req.user, req.params.id, req.body) })
  )
);

export default router;

