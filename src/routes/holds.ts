import { Router } from 'express';
import { getHolds, createHoldHandler, deleteHoldHandler } from '../controllers/holdsController.js';

const router = Router();

router.get('/', getHolds);
router.post('/', createHoldHandler);
router.delete('/:id', deleteHoldHandler);

export default router;