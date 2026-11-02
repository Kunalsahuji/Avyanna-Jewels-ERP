import { Router } from 'express';
import auth from './modules/auth/auth.routes.js';
import users from './modules/users/user.routes.js';
import delegations from './modules/delegation/delegation.routes.js';
import checklists from './modules/checklist/checklist.routes.js';
import tickets from './modules/tickets/ticket.routes.js';
import dashboard from './modules/dashboard/dashboard.routes.js';
import stock from './modules/stock/stock.routes.js';
import cityTransfers from './modules/cityTransfer/cityTransfer.routes.js';
import production from './modules/production/production.routes.js';
import supplier from './modules/supplier/supplier.routes.js';

const router = Router();
router.get('/health', (req, res) => res.json({ ok: true, uptime: process.uptime() }));
router.use('/auth', auth);
router.use('/users', users);
router.use('/delegations', delegations);
router.use('/checklists', checklists);
router.use('/tickets', tickets);
router.use('/dashboard', dashboard);
router.use('/stock', stock);
router.use('/city-transfers', cityTransfers);
router.use('/production', production);
router.use('/supplier', supplier);
router.use('/supplier-fms', supplier);

export default router;
