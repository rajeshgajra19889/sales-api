import { Router } from 'express';
import { getTopRented } from '../controllers/topRentedController.js';

const router= Router();

router.get('/',getTopRented);

export default router;