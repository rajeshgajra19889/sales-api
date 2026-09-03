import { Router } from 'express';
import { getStaff, getStaffByIdController, createStaffController, updateStaffController, deleteStaffController, getStaffPerformanceController } from '../controllers/staffController.js';

const router = Router();
router.get('/', getStaff);
router.get('/performance', getStaffPerformanceController);
router.get('/:id', getStaffByIdController);
router.post('/', createStaffController);
router.put('/:id', updateStaffController);
router.delete('/:id', deleteStaffController);
export default router;
