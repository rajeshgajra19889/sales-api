import { Router } from 'express';
import { getPaymentHistoryController } from '../controllers/paymentController.js';

const router = Router();
router.get('/:id', getPaymentHistoryController);
export default router;