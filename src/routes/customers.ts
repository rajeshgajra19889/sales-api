import { Router } from 'express';
import { getCustomers } from '../controllers/customerController.js';

const router = Router();
router.get('/', getCustomers);

export default router;