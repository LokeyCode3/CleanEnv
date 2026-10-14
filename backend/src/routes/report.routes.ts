import { Router } from 'express';
import {
  createReport,
  getReport,
  getMyReports,
  getNearbyReports,
  supportReport,
  checkDuplicate,
  validateImageRoute,
} from '../controllers/report.controller';
import { authenticate, optionalAuth } from '../middleware/auth';
import { upload, validateFileSizes } from '../middleware/upload';

const router = Router();

router.get('/my', authenticate, getMyReports);
router.get('/nearby', optionalAuth, getNearbyReports);
router.get('/check-duplicate', authenticate, checkDuplicate);
// Single-image validation at upload time (step 2 of report form)
router.post('/validate-image', authenticate, upload.single('image'), validateFileSizes, validateImageRoute);
router.get('/:id', authenticate, getReport);
router.post(
  '/',
  authenticate,
  upload.array('attachments', 6),
  validateFileSizes,
  createReport
);
router.post('/:id/support', authenticate, supportReport);

export default router;
