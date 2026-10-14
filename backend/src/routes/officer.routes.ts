import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '../types';
import { getAssignedReports, updateProgress, submitResolution } from '../controllers/officer.controller';
import { upload, validateFileSizes } from '../middleware/upload';

const router = Router();
router.use(authenticate, authorize(UserRole.OFFICER, UserRole.ADMIN, UserRole.SUPER_ADMIN));

router.get('/reports', getAssignedReports);
router.patch(
  '/reports/:id/progress',
  upload.array('progressImages', 4),
  validateFileSizes,
  updateProgress
);
router.post(
  '/reports/:id/resolve',
  upload.fields([
    { name: 'beforeImages', maxCount: 3 },
    { name: 'afterImages', maxCount: 3 },
  ]),
  validateFileSizes,
  submitResolution
);

export default router;
