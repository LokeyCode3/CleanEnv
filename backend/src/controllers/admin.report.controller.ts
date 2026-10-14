import { Response } from 'express';
import { Types } from 'mongoose';
import { Report } from '../models/Report';
import { AuthRequest, ReportStatus, Severity, AuditAction, UserRole } from '../types';
import { auditFromRequest } from '../services/audit.service';
import { notifyStatusChange } from '../services/notification.service';

// GET /api/admin/reports
export const listReports = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const {
      status, severity, categoryId, departmentId,
      city, district, ward, search,
      dateFrom, dateTo, isSlaBreach,
    } = req.query;

    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (severity) filter.severity = severity;
    if (categoryId) filter.categoryId = new Types.ObjectId(categoryId as string);
    if (departmentId) filter.departmentId = new Types.ObjectId(departmentId as string);
    if (city) filter['location.city'] = new RegExp(city as string, 'i');
    if (district) filter['location.district'] = new RegExp(district as string, 'i');
    if (ward) filter['location.area'] = new RegExp(ward as string, 'i');
    if (isSlaBreach === 'true') filter.isSlaBreach = true;
    if (search) {
      filter.$or = [
        { reportId: new RegExp(search as string, 'i') },
        { title: new RegExp(search as string, 'i') },
        { description: new RegExp(search as string, 'i') },
      ];
    }
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) (filter.createdAt as Record<string, unknown>).$gte = new Date(dateFrom as string);
      if (dateTo) (filter.createdAt as Record<string, unknown>).$lte = new Date(dateTo as string);
    }

    // Jurisdiction filter for non-super-admins
    if (req.user?.role === UserRole.ADMIN) {
      const user = await import('../models/User').then((m) =>
        m.User.findById(req.user!.userId).lean()
      );
      if (user?.jurisdictions?.cities?.length) {
        filter['location.city'] = { $in: user.jurisdictions.cities };
      }
    }

    const [reports, total] = await Promise.all([
      Report.find(filter)
        .populate('categoryId', 'name slug icon color')
        .populate('departmentId', 'name code')
        .populate('assignedOfficerId', 'name email')
        .populate('userId', 'name email phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Report.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        reports,
        pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to list reports' });
  }
};

// PATCH /api/admin/reports/:id/status
export const updateReportStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, comment } = req.body;
    const report = await Report.findOne({ reportId: req.params.id });
    if (!report) {
      res.status(404).json({ success: false, message: 'Report not found' });
      return;
    }

    const oldStatus = report.status;
    report.status = status;
    report.statusHistory.push({
      status,
      changedBy: new Types.ObjectId(req.user!.userId),
      changedByRole: req.user!.role,
      comment,
      timestamp: new Date(),
    });
    await report.save();

    await notifyStatusChange(report.userId, report._id, report.reportId, status);
    await auditFromRequest(req, AuditAction.STATUS_CHANGED, 'Report', report._id, {
      from: oldStatus,
      to: status,
      comment,
    });

    res.json({ success: true, message: 'Status updated', data: { report } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update status' });
  }
};

// PATCH /api/admin/reports/:id/assign
export const assignReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { departmentId, officerId } = req.body;
    const report = await Report.findOne({ reportId: req.params.id });
    if (!report) {
      res.status(404).json({ success: false, message: 'Report not found' });
      return;
    }

    const update: Record<string, unknown> = {};
    if (departmentId) update.departmentId = new Types.ObjectId(departmentId);
    if (officerId) update.assignedOfficerId = new Types.ObjectId(officerId);

    if (departmentId || officerId) {
      update.status = ReportStatus.ASSIGNED;
      report.statusHistory.push({
        status: ReportStatus.ASSIGNED,
        changedBy: new Types.ObjectId(req.user!.userId),
        changedByRole: req.user!.role,
        comment: `Assigned to ${departmentId ? 'department' : 'officer'}`,
        timestamp: new Date(),
      });
    }

    Object.assign(report, update);
    await report.save();

    if (departmentId) {
      await auditFromRequest(req, AuditAction.DEPARTMENT_ASSIGNED, 'Report', report._id, {
        departmentId,
      });
      await notifyStatusChange(report.userId, report._id, report.reportId, 'assigned');
    }
    if (officerId) {
      await auditFromRequest(req, AuditAction.OFFICER_ASSIGNED, 'Report', report._id, {
        officerId,
      });
    }

    res.json({ success: true, message: 'Report assigned', data: { report } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to assign report' });
  }
};

// POST /api/admin/reports/:id/comment
export const addComment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { text, isPublic } = req.body;
    const report = await Report.findOne({ reportId: req.params.id });
    if (!report) {
      res.status(404).json({ success: false, message: 'Report not found' });
      return;
    }

    report.internalComments.push({
      text,
      addedBy: new Types.ObjectId(req.user!.userId),
      addedByRole: req.user!.role,
      isPublic: isPublic || false,
      createdAt: new Date(),
    });
    await report.save();

    res.json({ success: true, message: 'Comment added' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to add comment' });
  }
};

// PATCH /api/admin/reports/:id/severity
export const updateSeverity = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { severity, reason } = req.body;
    const report = await Report.findOne({ reportId: req.params.id });
    if (!report) {
      res.status(404).json({ success: false, message: 'Report not found' });
      return;
    }

    const old = report.severity;
    report.severity = severity;
    await report.save();

    await auditFromRequest(req, AuditAction.SEVERITY_CHANGED, 'Report', report._id, {
      from: old, to: severity, reason,
    });

    res.json({ success: true, message: 'Severity updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update severity' });
  }
};

// PATCH /api/admin/reports/:id/reject
export const rejectReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { reason } = req.body;
    const report = await Report.findOne({ reportId: req.params.id });
    if (!report) {
      res.status(404).json({ success: false, message: 'Report not found' });
      return;
    }

    report.status = ReportStatus.REJECTED;
    report.rejectionReason = reason;
    report.statusHistory.push({
      status: ReportStatus.REJECTED,
      changedBy: new Types.ObjectId(req.user!.userId),
      changedByRole: req.user!.role,
      comment: reason,
      timestamp: new Date(),
    });
    await report.save();

    await notifyStatusChange(report.userId, report._id, report.reportId, 'rejected');
    await auditFromRequest(req, AuditAction.REPORT_REJECTED, 'Report', report._id, { reason });

    res.json({ success: true, message: 'Report rejected' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to reject report' });
  }
};

// PATCH /api/admin/reports/:id/duplicate
export const markDuplicate = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { parentReportId } = req.body;
    const report = await Report.findOne({ reportId: req.params.id });
    if (!report) {
      res.status(404).json({ success: false, message: 'Report not found' });
      return;
    }

    const parent = await Report.findOne({ reportId: parentReportId });
    if (!parent) {
      res.status(404).json({ success: false, message: 'Parent report not found' });
      return;
    }

    report.status = ReportStatus.DUPLICATE;
    report.isDuplicate = true;
    report.parentReportId = parent._id;
    report.statusHistory.push({
      status: ReportStatus.DUPLICATE,
      changedBy: new Types.ObjectId(req.user!.userId),
      changedByRole: req.user!.role,
      comment: `Marked as duplicate of ${parentReportId}`,
      timestamp: new Date(),
    });
    await report.save();

    parent.duplicateReports.push(report._id);
    parent.supportCount += 1;
    await parent.save();

    await auditFromRequest(req, AuditAction.DUPLICATE_MARKED, 'Report', report._id, {
      parentReportId,
    });

    res.json({ success: true, message: 'Report marked as duplicate' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to mark duplicate' });
  }
};
