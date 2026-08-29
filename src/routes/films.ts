import { Router } from 'express';
import {
    getFilms,
    getFilmsById,
    createFilms,
    updateFilmsById,
    deleteFilmsById,
    getFilmActors,
    replaceFilmActorsHandler
} from '../controllers/filmController.js';

const router = Router();

router.get('/', getFilms);
router.post('/', createFilms);
router.get('/:id', getFilmsById);
router.put('/:id', updateFilmsById);
router.delete('/:id', deleteFilmsById);
router.get('/:id/actors', getFilmActors);
router.put('/:id/actors', replaceFilmActorsHandler);

export default router;