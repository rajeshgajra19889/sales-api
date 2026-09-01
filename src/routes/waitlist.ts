import { Router } from 'express';
import { getWaitlist, createWaitlistHandler, deleteWaitlistHandler, promoteHandler } from '../controllers/waitlistController.js';

const router = Router();

router.get('/', getWaitlist);
router.post('/', createWaitlistHandler);
router.post('/promote', promoteHandler);
router.delete('/:id', deleteWaitlistHandler);

export default router;