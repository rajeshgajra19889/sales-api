import { Router } from 'express';
import {
    getInventory,
    getInventoryItem,
    createInventory,
    moveInventoryCopy,
    stockSummary,
    inventoryRenters,
    deleteInventoryCopy
} from '../controllers/inventoryController.js';

const router = Router();

router.get('/', getInventory);
router.get('/summary', stockSummary);
router.get('/renters', inventoryRenters);
router.get('/:id', getInventoryItem);
router.post('/', createInventory);
router.post('/:id/move', moveInventoryCopy);
router.delete('/:id', deleteInventoryCopy);

export default router;
