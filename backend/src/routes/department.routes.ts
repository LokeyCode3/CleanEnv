import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '../types';
import {
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getDepartmentOfficers,
} from '../controllers/department.controller';

const router = Router();

router.get('/', getDepartments);
router.get('/:id/officers', authenticate, getDepartmentOfficers);
router.post('/', authenticate, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), createDepartment);
router.put('/:id', authenticate, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), updateDepartment);
router.delete('/:id', authenticate, authorize(UserRole.SUPER_ADMIN), deleteDepartment);

export default router;
