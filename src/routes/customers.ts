import { Router } from 'express';
import { getCustomers, getCustomer, createCustomerController, updateCustomerController } from '../controllers/customerController.js';

const router = Router();

router.get('/', getCustomers);
router.get('/:id', getCustomer);
router.post('/', createCustomerController);
router.put('/:id', updateCustomerController);

export default router;