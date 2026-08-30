import { Router } from 'express';
import { getRentals, getRental } from '../controllers/rentalController.js';

const router = Router();

router.get('/', getRentals);
router.get('/:id', getRental);

export default router;