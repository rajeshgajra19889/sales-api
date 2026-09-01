import { Router } from 'express';
import { getCities } from '../controllers/addressController.js';

const router = Router();
router.get('/', getCities);
export default router;