import { Router } from 'express';
import { createAddressController, getAddresses } from '../controllers/addressController.js';

const router = Router();
router.get('/', getAddresses);
router.post('/', createAddressController);
export default router;