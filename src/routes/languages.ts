import { Router } from 'express';
import { getLanguagesController } from '../controllers/languageController.js';

const router = Router();
router.get('/', getLanguagesController);
export default router;