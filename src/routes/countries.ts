import { Router } from 'express';
import { getCountriesController } from '../controllers/addressController.js';

const router = Router();
router.get('/', getCountriesController);
export default router;