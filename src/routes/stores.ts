import { Router } from 'express';
import { createStoreController, deleteStoreController, getStoreById, getStores, getStoreComparisonController, getStoreStatsController, updateStoreController } from '../controllers/storeController.js';

const router = Router();
router.get('/', getStores);
router.get('/comparison', getStoreComparisonController);
router.post('/', createStoreController);
router.get('/:id/stats', getStoreStatsController);
router.get('/:id', getStoreById);
router.put('/:id', updateStoreController);
router.delete('/:id', deleteStoreController);
export default router;