import { Response } from 'express';
import { Types } from 'mongoose';
import { Report } from '../models/Report';
import { Support } from '../models/Support';
import { AuthRequest, ReportStatus, Severity, AuditAction, UserRole } from '../types';
import { generateReportId } from '../services/reportId.service';
import { uploadToCloudinary } from '../services/cloudinary.service';
import { notifyReportSubmitted, notifyStatusChange } from '../services/notification.service';
import { calculateSlaDeadline } from '../services/sla.service';
import { auditFromRequest } from '../services/audit.service';
import { validateAllImages } from '../services/imageValidation.service';
import { IssueCategory } from '../models/IssueCategory';

// POST /api/reports
export const createReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      categoryId,
      title,
      description,
      severity,
      location,
      primaryImageIndex,
    } = req.body;

    const files = req.files as Express.Multer.File[] | undefined;
    const attachments = [];

    if (files?.length) {
      // ── AI image validation ──────────────────────────────────────────────
      // Look up the category slug so we can pass it to the CLIP service.
      const category = await IssueCategory.findById(categoryId).select('slug').lean();
      const categorySlug = category?.slug ?? 'other';

      const failure = await validateAllImages(files, description, categorySlug);
      if (failure) {
        res.status(422).json({
          success: false,
          message: `Image ${failure.fileIndex + 1} failed relevance check: ${failure.result.reason}`,
          data: {
            fileIndex: failure.fileIndex,
            score: failure.result.score,
          },
        });
        return;
      }
      // ── End AI validation ────────────────────────────────────────────────

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const result = await uploadToCloudinary(file.buffer, file.mimetype, 'reports');
        attachments.push({
          url: result.url,
          publicId: result.publicId,
          type: result.type,
          isPrimary: i === parseInt(primaryImageIndex ?? '0', 10),
          uploadedBy: new Types.ObjectId(req.user!.userId),
          uploadedAt: new Date(),
        });
      }
    }

    const parsedLocation = typeof location === 'string' ? JSON.parse(location) : location;
    const reportId = await generateReportId();
    const userId = new Types.ObjectId(req.user!.userId);
    const catId = new Types.ObjectId(categoryId);

    const slaDeadline = await calculateSlaDeadline(catId, severity || Severity.MEDIUM);

    const report = await Report.create({
      reportId,
      userId,
      categoryId: catId,
      title,
      description,
      severity: severity || Severity.MEDIUM,
      status: ReportStatus.SUBMITTED,
      location: parsedLocation,
      attachments,
      slaDeadline,
      statusHistory: [
        {
          status: ReportStatus.SUBMITTED,
          changedBy: userId,
          changedByRole: UserRole.CITIZEN,
          comment: 'Report submitted by citizen',
          timestamp: new Date(),
        },
      ],
    });

    await notifyReportSubmitted(userId, report._id, reportId);
    await auditFromRequest(req, AuditAction.REPORT_CREATED, 'Report', report._id, {
      reportId,
      categoryId,
      severity,
    });

    res.status(201).json({
      success: true,
      message: 'Report submitted successfully',
      data: { report },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to create report', error: String(err) });
  }
};

// GET /api/reports/:id
export const getReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const report = await Report.findOne({ reportId: req.params.id })
      .populate('userId', 'name')
      .populate('categoryId', 'name slug icon color')
      .populate('departmentId', 'name code')
      .populate('assignedOfficerId', 'name email phone')
      .populate('statusHistory.changedBy', 'name role')
      .populate('internalComments.addedBy', 'name role');

    if (!report) {
      res.status(404).json({ success: false, message: 'Report not found' });
      return;
    }

    // Citizens can only see their own reports' private fields.
    // report.userId is a populated object after .populate(), so we must
    // extract the _id from it rather than casting the whole object to string.
    const isCitizen = req.user?.role === UserRole.CITIZEN;
    const reportOwnerId =
      report.userId && typeof report.userId === 'object' && '_id' in report.userId
        ? String((report.userId as { _id: Types.ObjectId })._id)
        : String(report.userId);
    const isOwner = reportOwnerId === req.user?.userId;

    if (isCitizen && !isOwner) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }

    // Filter internal (non-public) comments for citizens
    const responseData = report.toObject();
    if (isCitizen) {
      responseData.internalComments = responseData.internalComments.filter(
        (c: { isPublic: boolean }) => c.isPublic
      );
    }

    res.json({ success: true, data: { report: responseData } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch report' });
  }
};

// GET /api/reports/my
export const getMyReports = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const { status, categoryId } = req.query;

    const filter: Record<string, unknown> = { userId: new Types.ObjectId(req.user!.userId) };
    if (status) filter.status = status;
    if (categoryId) filter.categoryId = new Types.ObjectId(categoryId as string);

    const [reports, total] = await Promise.all([
      Report.find(filter)
        .populate('categoryId', 'name slug icon color')
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

// GET /api/reports/nearby
export const getNearbyReports = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { lat, lng, radius = 2000, category, severity, status } = req.query;

    if (!lat || !lng) {
      res.status(400).json({ success: false, message: 'lat and lng are required' });
      return;
    }

    const filter: Record<string, unknown> = {
      location: {
        $nearSphere: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng as string), parseFloat(lat as string)],
          },
          $maxDistance: parseInt(radius as string),
        },
      },
      status: { $nin: [ReportStatus.REJECTED, ReportStatus.DUPLICATE] },
    };

    if (category) filter.categoryId = new Types.ObjectId(category as string);
    if (severity) filter.severity = severity;
    if (status) filter.status = status;

    const reports = await Report.find(filter)
      .populate('categoryId', 'name slug icon color')
      .select('-userId -internalComments -statusHistory')
      .limit(100)
      .lean();

    res.json({ success: true, data: { reports } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch nearby reports' });
  }
};

// POST /api/reports/:id/support
export const supportReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const report = await Report.findOne({ reportId: req.params.id });
    if (!report) {
      res.status(404).json({ success: false, message: 'Report not found' });
      return;
    }

    const userId = new Types.ObjectId(req.user!.userId);

    const existing = await Support.findOne({ reportId: report._id, userId });
    if (existing) {
      res.status(400).json({ success: false, message: 'You already support this report' });
      return;
    }

    await Support.create({ reportId: report._id, userId });
    await Report.findByIdAndUpdate(report._id, { $inc: { supportCount: 1 } });

    res.json({ success: true, message: 'Support added' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to add support' });
  }
};

// POST /api/reports/validate-image
// Called from the frontend at step 2 (photo upload) to validate a single image
// before the user fills out the rest of the form.
export const validateImageRoute = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const file = req.file as Express.Multer.File | undefined;
    const { categoryId, description } = req.body;

    if (!file) {
      res.status(400).json({ success: false, message: 'No image provided' });
      return;
    }

    if (!file.mimetype.startsWith('image/')) {
      // Videos are not validated — always pass
      res.json({ success: true, valid: true, score: 1, reason: 'Video files are not validated' });
      return;
    }

    // Look up category slug
    let categorySlug = 'other';
    if (categoryId) {
      const category = await IssueCategory.findById(categoryId).select('slug').lean();
      categorySlug = category?.slug ?? 'other';
    }

    const { validateImageRelevance } = await import('../services/imageValidation.service');
    const result = await validateImageRelevance(
      file.buffer,
      file.mimetype,
      description || '',
      categorySlug
    );

    res.json({ success: true, ...result });
  } catch (err) {
    console.error('validateImageRoute error:', err);
    // Fail open — don't block upload if validation itself errors
    res.json({ success: true, valid: true, score: 0, reason: 'Validation error – skipped' });
  }
};

// GET /api/reports/check-duplicate
export const checkDuplicate = async (req: AuthRequest, res: Response): Promise<void> => {  try {
    const { lat, lng, categoryId, radius = 50 } = req.query;

    if (!lat || !lng || !categoryId) {
      res.status(400).json({ success: false, message: 'lat, lng, categoryId required' });
      return;
    }

    const nearby = await Report.find({
      categoryId: new Types.ObjectId(categoryId as string),
      status: { $nin: [ReportStatus.REJECTED, ReportStatus.DUPLICATE, ReportStatus.CLOSED] },
      location: {
        $nearSphere: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng as string), parseFloat(lat as string)],
          },
          $maxDistance: parseInt(radius as string),
        },
      },
    })
      .populate('categoryId', 'name icon')
      .select('reportId title severity status supportCount createdAt location.address attachments')
      .limit(5)
      .lean();

    res.json({
      success: true,
      data: {
        hasDuplicates: nearby.length > 0,
        reports: nearby,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Duplicate check failed' });
  }
};
