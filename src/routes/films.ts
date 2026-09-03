import { Router } from 'express';
import {
    getFilms,
    getFilmsById,
    createFilms,
    updateFilmsById,
    deleteFilmsById,
    getFilmActors,
    replaceFilmActorsHandler,
    getFilmCategories,
    replaceFilmCategoriesHandler
} from '../controllers/filmController.js';
import { getFilmInventory, addFilmInventory } from '../controllers/inventoryController.js';

const router = Router();

router.get('/', getFilms);
router.post('/', createFilms);
router.get('/:id', getFilmsById);
router.put('/:id', updateFilmsById);
router.delete('/:id', deleteFilmsById);
router.get('/:id/actors', getFilmActors);
router.put('/:id/actors', replaceFilmActorsHandler);
router.get('/:id/categories', getFilmCategories);
router.put('/:id/categories', replaceFilmCategoriesHandler);
router.get('/:id/inventory', getFilmInventory);
router.post('/:id/inventory', addFilmInventory);

export default router;