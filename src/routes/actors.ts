import { Router } from 'express';
import {
    createActorHandler,
    deleteActorHandler,
    getActorHandler,
    getActors,
    updateActorHandler
} from '../controllers/actorController.js';

const router = Router();

router.get('/', getActors);
router.get('/:id', getActorHandler);
router.post('/', createActorHandler);
router.put('/:id', updateActorHandler);
router.delete('/:id', deleteActorHandler);

export default router;