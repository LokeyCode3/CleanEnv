import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '../types';
import {
  listReports,
  updateReportStatus,
  assignReport,
  addComment,
  updateSeverity,
  rejectReport,
  markDuplicate,
} from '../controllers/admin.report.controller';
import {
  getDashboardStats,
  getReportsOverTime,
  getReportsByCategory,
  getReportsBySeverity,
  getHeatmapData,
  getDepartmentPerformance,
} from '../controllers/analytics.controller';
import { listUsers, createUser, updateUser, deleteUser } from '../controllers/user.controller';
import { AuditLog } from '../models/AuditLog';
import { Request, Response } from 'express';

const router = Router();
const adminRoles = [UserRole.ADMIN, UserRole.SUPER_ADMIN];

// All admin routes require auth + admin role
router.use(authenticate, authorize(...adminRoles));

// Reports
router.get('/reports', listReports);
router.patch('/reports/:id/status', updateReportStatus);
router.patch('/reports/:id/assign', assignReport);
router.post('/reports/:id/comment', addComment);
router.patch('/reports/:id/severity', updateSeverity);
router.patch('/reports/:id/reject', rejectReport);
router.patch('/reports/:id/duplicate', markDuplicate);

// Analytics
router.get('/analytics/dashboard', getDashboardStats);
router.get('/analytics/over-time', getReportsOverTime);
router.get('/analytics/by-category', getReportsByCategory);
router.get('/analytics/by-severity', getReportsBySeverity);
router.get('/analytics/heatmap', getHeatmapData);
router.get('/analytics/departments', getDepartmentPerformance);

// Users
router.get('/users', listUsers);
router.post('/users', createUser);
router.patch('/users/:id', updateUser);
router.delete('/users/:id', authorize(UserRole.SUPER_ADMIN), deleteUser);

// Audit logs
router.get('/audit-logs', authorize(UserRole.SUPER_ADMIN), async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const skip = (page - 1) * limit;
  const logs = await AuditLog.find()
    .populate('performedBy', 'name email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
  const total = await AuditLog.countDocuments();
  res.json({
    success: true,
    data: { logs, pagination: { total, page, limit, pages: Math.ceil(total / limit) } },
  });
});

export default router;
