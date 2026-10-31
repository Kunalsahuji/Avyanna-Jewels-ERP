import { asyncHandler } from '../utils/asyncHandler.js';

// Thin HTTP layer — all rules live in the service.
export const crudController = (service) => ({
  list: asyncHandler(async (req, res) => res.json({ success: true, ...(await service.list(req.user, req.query)) })),
  stats: asyncHandler(async (req, res) => res.json({ success: true, data: await service.stats(req.user, req.query) })),
  create: asyncHandler(async (req, res) => res.status(201).json({ success: true, data: await service.create(req.user, req.body) })),
  update: asyncHandler(async (req, res) => res.json({ success: true, data: await service.update(req.user, req.params.id, req.body) })),
  complete: asyncHandler(async (req, res) => res.json({ success: true, data: await service.complete(req.user, req.params.id, req.body) })),
  remove: asyncHandler(async (req, res) => { await service.remove(req.params.id); res.status(204).end(); }),
});
