import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '../types';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../controllers/category.controller';

const router = Router();

router.get('/', getCategories);
router.post('/', authenticate, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), createCategory);
router.put('/:id', authenticate, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), updateCategory);
router.delete('/:id', authenticate, authorize(UserRole.SUPER_ADMIN), deleteCategory);

export default router;
