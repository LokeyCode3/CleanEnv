import { Response } from 'express';
import { Types } from 'mongoose';
import { Report } from '../models/Report';
import { AuthRequest, ReportStatus, AuditAction, UserRole } from '../types';
import { uploadToCloudinary } from '../services/cloudinary.service';
import { auditFromRequest } from '../services/audit.service';
import { notifyStatusChange } from '../services/notification.service';

// GET /api/officer/reports
export const getAssignedReports = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await import('../models/User').then((m) =>
      m.User.findById(req.user!.userId).lean()
    );

    const filter: Record<string, unknown> = {
      status: { $nin: [ReportStatus.REJECTED, ReportStatus.DUPLICATE] },
    };

    if (user?.departmentId) {
      filter.$or = [
        { departmentId: user.departmentId },
        { assignedOfficerId: new Types.ObjectId(req.user!.userId) },
      ];
    } else {
      filter.assignedOfficerId = new Types.ObjectId(req.user!.userId);
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const { status } = req.query;
    if (status) filter.status = status;

    const [reports, total] = await Promise.all([
      Report.find(filter)
        .populate('categoryId', 'name slug icon')
        .populate('departmentId', 'name')
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
    res.status(500).json({ success: false, message: 'Failed to fetch reports' });
  }
};

// PATCH /api/officer/reports/:id/progress
export const updateProgress = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { note, status } = req.body;
    const files = req.files as Express.Multer.File[] | undefined;

    const report = await Report.findOne({ reportId: req.params.id });
    if (!report) {
      res.status(404).json({ success: false, message: 'Report not found' });
      return;
    }

    if (status) {
      report.status = status;
      report.statusHistory.push({
        status,
        changedBy: new Types.ObjectId(req.user!.userId),
        changedByRole: UserRole.OFFICER,
        comment: note,
        timestamp: new Date(),
      });
    }

    if (files?.length) {
      for (const file of files) {
        const result = await uploadToCloudinary(file.buffer, file.mimetype, 'progress');
        report.attachments.push({
          url: result.url,
          publicId: result.publicId,
          type: result.type,
          isPrimary: false,
          uploadedBy: new Types.ObjectId(req.user!.userId),
          uploadedAt: new Date(),
        });
      }
    }

    if (note) {
      report.internalComments.push({
        text: note,
        addedBy: new Types.ObjectId(req.user!.userId),
        addedByRole: UserRole.OFFICER,
        isPublic: false,
        createdAt: new Date(),
      });
    }

    await report.save();

    if (status) {
      await notifyStatusChange(report.userId, report._id, report.reportId, status);
    }

    res.json({ success: true, message: 'Progress updated', data: { report } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update progress' });
  }
};

// POST /api/officer/reports/:id/resolve
export const submitResolution = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { description } = req.body;
    const files = req.files as Express.Multer.File[] | undefined;

    const report = await Report.findOne({ reportId: req.params.id });
    if (!report) {
      res.status(404).json({ success: false, message: 'Report not found' });
      return;
    }

    const beforeImages: string[] = [];
    const afterImages: string[] = [];

    if (files?.length) {
      for (const file of files) {
        const result = await uploadToCloudinary(file.buffer, file.mimetype, 'resolution');
        const fieldname = file.fieldname;
        if (fieldname === 'beforeImages') {
          beforeImages.push(result.url);
        } else {
          afterImages.push(result.url);
        }
      }
    }

    report.resolution = {
      description,
      resolvedBy: new Types.ObjectId(req.user!.userId),
      resolvedAt: new Date(),
      beforeImages,
      afterImages,
    };
    report.status = ReportStatus.RESOLVED;
    report.statusHistory.push({
      status: ReportStatus.RESOLVED,
      changedBy: new Types.ObjectId(req.user!.userId),
      changedByRole: UserRole.OFFICER,
      comment: `Resolution submitted: ${description}`,
      timestamp: new Date(),
    });

    await report.save();
    await notifyStatusChange(report.userId, report._id, report.reportId, 'resolved');
    await auditFromRequest(req, AuditAction.RESOLUTION_SUBMITTED, 'Report', report._id, {
      description,
    });

    res.json({ success: true, message: 'Resolution submitted', data: { report } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to submit resolution' });
  }
};
