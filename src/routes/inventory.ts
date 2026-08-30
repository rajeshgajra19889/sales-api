import { Router } from 'express';
import { getInventory, getInventoryItem } from '../controllers/inventoryController.js';

const router = Router();

router.get('/', getInventory);
router.get('/:id', getInventoryItem);

export default router;