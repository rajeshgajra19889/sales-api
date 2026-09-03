import { Router } from 'express';
import {
    getAddresses,
    createAddressController,
    getAddressController,
    updateAddressController,
    deleteAddressController
} from '../controllers/addressController.js';

const router = Router();
router.get('/', getAddresses);
router.get('/:id', getAddressController);
router.post('/', createAddressController);
router.put('/:id', updateAddressController);
router.delete('/:id', deleteAddressController);
export default router;