import { Router } from 'express';
import { getRevenue, exportRevenueController } from '../controllers/revenueController.js';

const router = Router();
router.get('/', getRevenue);
router.get('/export', exportRevenueController);
export default router;
