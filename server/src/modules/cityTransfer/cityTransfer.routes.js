import { Router } from 'express';
import { z } from 'zod';
import { protect, restrictTo } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { crudController } from '../../common/crud.controller.js';
import { idParam } from '../../common/schemas.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { BRANCH_LOCATIONS, CARRIER_TYPES, TRANSFER_STATUS } from './cityTransfer.model.js';
import { cityTransferService as svc } from './cityTransfer.service.js';

const parcelItemSchema = z.object({
  parcelId: z.string(),
  title: z.string(),
  grossWeight: z.coerce.number().positive(),
  netWeight: z.coerce.number().positive(),
  diamondCarat: z.coerce.number().nonnegative().default(0),
  valuation: z.coerce.number().nonnegative().default(0),
  purity: z.string().default('18K'),
});

const createSchema = z.object({
  fromLocation: z.enum(BRANCH_LOCATIONS),
  toLocation: z.enum(BRANCH_LOCATIONS),
  parcels: z.array(parcelItemSchema).optional(),
  totalGrossWeight: z.coerce.number().positive().optional(),
  totalNetWeight: z.coerce.number().positive().optional(),
  totalDiamondCarat: z.coerce.number().nonnegative().optional(),
  totalValuation: z.coerce.number().positive().optional(),
  carrierType: z.enum(CARRIER_TYPES).default('Secured Armored Carrier'),
  carrierPersonName: z.string().optional(),
  carrierContact: z.string().optional(),
  waybillNo: z.string().optional(),
  vehicleNo: z.string().optional(),
  notes: z.string().max(1000).optional(),
});

const updateSchema = createSchema.partial();

const approveSchema = z.object({
  remarks: z.string().max(500).optional(),
});

const dispatchSchema = z.object({
  carrierType: z.enum(CARRIER_TYPES).optional(),
  carrierPersonName: z.string().optional(),
  carrierContact: z.string().optional(),
  waybillNo: z.string().optional(),
  vehicleNo: z.string().optional(),
  remarks: z.string().max(500).optional(),
});

const receiveSchema = z.object({
  weighedReturnGrossWeight: z.coerce.number().positive().optional(),
  remarks: z.string().max(500).optional(),
});

const rejectSchema = z.object({
  reason: z.string().min(3).max(500),
});

const c = crudController(svc);
const router = Router();
router.use(protect);

router.get('/', c.list);
router.get('/stats', c.stats);
router.get('/:id', validate({ params: idParam }), c.get);

router.post('/', validate({ body: createSchema }), c.create);
router.patch('/:id', restrictTo('admin', 'manager'), validate({ params: idParam, body: updateSchema }), c.update);
router.delete('/:id', restrictTo('admin'), validate({ params: idParam }), c.remove);

router.post(
  '/:id/approve',
  restrictTo('admin', 'manager'),
  validate({ params: idParam, body: approveSchema }),
  asyncHandler(async (req, res) =>
    res.json({ success: true, data: await svc.approveTransfer(req.user, req.params.id, req.body) })
  )
);

router.post(
  '/:id/dispatch',
  restrictTo('admin', 'manager'),
  validate({ params: idParam, body: dispatchSchema }),
  asyncHandler(async (req, res) =>
    res.json({ success: true, data: await svc.dispatchTransfer(req.user, req.params.id, req.body) })
  )
);

router.post(
  '/:id/receive',
  validate({ params: idParam, body: receiveSchema }),
  asyncHandler(async (req, res) =>
    res.json({ success: true, data: await svc.receiveTransfer(req.user, req.params.id, req.body) })
  )
);

router.post(
  '/:id/reject',
  restrictTo('admin', 'manager'),
  validate({ params: idParam, body: rejectSchema }),
  asyncHandler(async (req, res) =>
    res.json({ success: true, data: await svc.rejectTransfer(req.user, req.params.id, req.body) })
  )
);

export default router;
