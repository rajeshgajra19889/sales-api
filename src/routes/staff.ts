import { Router } from 'express';
import { getStaff, getStaffByIdController, createStaffController, updateStaffController, deleteStaffController } from '../controllers/staffController.js';

const router = Router();
router.get('/', getStaff);
router.get('/:id', getStaffByIdController);
router.post('/', createStaffController);
router.put('/:id', updateStaffController);
router.delete('/:id', deleteStaffController);
export default router;
