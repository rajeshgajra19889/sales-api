import { Router } from 'express';
import { getRevenue } from '../controllers/revenueController.js';

const router = Router();
router.get('/', getRevenue);
export default router;