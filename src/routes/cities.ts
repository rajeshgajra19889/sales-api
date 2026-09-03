import { Router } from 'express';
import {
    getCitiesController,
    getCityController,
    createCityController,
    updateCityController,
    deleteCityController
} from '../controllers/addressController.js';

const router = Router();
router.get('/', getCitiesController);
router.get('/:id', getCityController);
router.post('/', createCityController);
router.put('/:id', updateCityController);
router.delete('/:id', deleteCityController);
export default router;