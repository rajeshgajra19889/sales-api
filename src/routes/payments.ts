import { Router } from 'express';
import {
    getPayments,
    exportPaymentsController,
    getPaymentByIdController,
    createPaymentController,
    updatePaymentController,
    deletePaymentController,
    getPaymentHistoryController
} from '../controllers/paymentController.js';

const router = Router();
router.get('/', getPayments);
router.get('/export', exportPaymentsController);
router.get('/customer/:id', getPaymentHistoryController);
router.get('/:id', getPaymentByIdController);
router.post('/', createPaymentController);
router.put('/:id', updatePaymentController);
router.delete('/:id', deletePaymentController);
export default router;