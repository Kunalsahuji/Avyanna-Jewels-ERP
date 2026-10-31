import { Router } from 'express';
import { z } from 'zod';
import { protect, restrictTo } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { crudController } from '../../common/crud.controller.js';
import { idParam, objectId } from '../../common/schemas.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { TICKET_STATUS } from './ticket.model.js';
import { ticketService as svc } from './ticket.service.js';

const createSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  assignedTo: objectId.optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  dueDate: z.coerce.date().optional(),
});
const updateSchema = createSchema.partial().extend({ status: z.enum(TICKET_STATUS).optional() });
const remarkSchema = z.object({ remark: z.string().max(500).optional() });

const c = crudController(svc);
const router = Router();
router.use(protect);

router.get('/', c.list);
router.get('/stats', c.stats);
router.post('/', validate({ body: createSchema }), c.create);
router.patch('/:id', restrictTo('admin', 'manager'), validate({ params: idParam, body: updateSchema }), c.update);
router.delete('/:id', restrictTo('admin'), validate({ params: idParam }), c.remove);
router.post('/:id/complete', validate({ params: idParam, body: remarkSchema }), c.complete);
// Reviewer closes a ticket that is waiting in review
router.post('/:id/close', restrictTo('admin', 'manager'), validate({ params: idParam }),
  asyncHandler(async (req, res) => res.json({ success: true, data: await svc.update(req.user, req.params.id, { status: 'closed', closedAt: new Date() }) })));

export default router;
