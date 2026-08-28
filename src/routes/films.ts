import { Router } from 'express';
import {
    getFilms,
    getFilmsById,
    createFilms,
    updateFilmsById,
    deleteFilmsById
} from '../controllers/filmController.js';

const router = Router();

router.get('/', getFilms);
router.post('/', createFilms);
router.get('/:id', getFilmsById);
router.put('/:id', updateFilmsById);
router.delete('/:id', deleteFilmsById);

export default router;