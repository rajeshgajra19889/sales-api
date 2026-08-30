import { Router } from 'express';
import { getInventory, 
         getInventoryItem,
        createInventory,
        moveInventoryCopy,
        stockSummary } from '../controllers/inventoryController.js';

const router = Router();

router.get('/', getInventory);
router.get('/summary', stockSummary);
router.get('/:id', getInventoryItem);
router.post('/', createInventory);
router.post('/:id/move', moveInventoryCopy);

export default router;