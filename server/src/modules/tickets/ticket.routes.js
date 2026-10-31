import { Router } from 'express';
import { z } from 'zod';
import { protect, restrictTo } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { crudController } from '../../common/crud.controller.js';
import { idParam, objectId } from '../../common/schemas.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { TICKET_STATUS, PRIORITY } from './ticket.model.js';
import { ticketService as svc } from './ticket.service.js';

const createSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  department: z.string().default('IT'),
  assignedTo: objectId.optional(),
  priority: z.enum(PRIORITY).default('medium'),
  dueDate: z.coerce.date().optional(),
});

const updateSchema = createSchema.partial().extend({
  status: z.enum(TICKET_STATUS).optional(),
});

const resolveSchema = z.object({
  resolutionNotes: z.string().max(1000).optional(),
  remark: z.string().max(500).optional(),
});

const commentSchema = z.object({
  text: z.string().min(1).max(1000),
});

const c = crudController(svc);
const router = Router();
router.use(protect);

router.get('/', c.list);
router.get('/stats', c.stats);
router.post('/', validate({ body: createSchema }), c.create);
router.patch('/:id', restrictTo('admin', 'manager'), validate({ params: idParam, body: updateSchema }), c.update);
router.delete('/:id', restrictTo('admin'), validate({ params: idParam }), c.remove);

router.post(
  '/:id/resolve',
  validate({ params: idParam, body: resolveSchema }),
  asyncHandler(async (req, res) =>
    res.json({ success: true, data: await svc.resolve(req.user, req.params.id, req.body) })
  )
);

router.post(
  '/:id/close',
  restrictTo('admin', 'manager'),
  validate({ params: idParam, body: resolveSchema }),
  asyncHandler(async (req, res) =>
    res.json({ success: true, data: await svc.close(req.user, req.params.id, req.body) })
  )
);

router.post(
  '/:id/reopen',
  restrictTo('admin', 'manager'),
  validate({ params: idParam, body: resolveSchema }),
  asyncHandler(async (req, res) =>
    res.json({ success: true, data: await svc.reopen(req.user, req.params.id, req.body) })
  )
);

router.post(
  '/:id/comments',
  validate({ params: idParam, body: commentSchema }),
  asyncHandler(async (req, res) =>
    res.json({ success: true, data: await svc.addComment(req.user, req.params.id, req.body.text) })
  )
);

export default router;
