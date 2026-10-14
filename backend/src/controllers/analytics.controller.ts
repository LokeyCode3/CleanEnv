import { Response } from 'express';
import { Report } from '../models/Report';
import { AuthRequest, ReportStatus, Severity } from '../types';
import { startOfMonth, subMonths, endOfMonth } from 'date-fns';

// GET /api/admin/analytics/dashboard
export const getDashboardStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [
      total,
      submitted,
      underReview,
      verified,
      assigned,
      wip,
      resolved,
      rejected,
      critical,
      slaBreach,
    ] = await Promise.all([
      Report.countDocuments({}),
      Report.countDocuments({ status: ReportStatus.SUBMITTED }),
      Report.countDocuments({ status: ReportStatus.UNDER_REVIEW }),
      Report.countDocuments({ status: ReportStatus.VERIFIED }),
      Report.countDocuments({ status: ReportStatus.ASSIGNED }),
      Report.countDocuments({ status: ReportStatus.WORK_IN_PROGRESS }),
      Report.countDocuments({ status: ReportStatus.RESOLVED }),
      Report.countDocuments({ status: ReportStatus.REJECTED }),
      Report.countDocuments({ severity: Severity.CRITICAL, status: { $nin: [ReportStatus.RESOLVED, ReportStatus.CLOSED, ReportStatus.REJECTED] } }),
      Report.countDocuments({ isSlaBreach: true }),
    ]);

    res.json({
      success: true,
      data: {
        stats: {
          total, submitted, underReview, verified,
          assigned, wip, resolved, rejected, critical, slaBreach,
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch stats' });
  }
};

// GET /api/admin/analytics/reports-over-time
export const getReportsOverTime = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const months = parseInt(req.query.months as string) || 6;
    const data = [];

    for (let i = months - 1; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const start = startOfMonth(date);
      const end = endOfMonth(date);

      const [total, resolved] = await Promise.all([
        Report.countDocuments({ createdAt: { $gte: start, $lte: end } }),
        Report.countDocuments({
          status: { $in: [ReportStatus.RESOLVED, ReportStatus.CLOSED] },
          updatedAt: { $gte: start, $lte: end },
        }),
      ]);

      data.push({
        month: start.toISOString().substring(0, 7),
        total,
        resolved,
      });
    }

    res.json({ success: true, data: { chart: data } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch chart data' });
  }
};

// GET /api/admin/analytics/by-category
export const getReportsByCategory = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = await Report.aggregate([
      { $group: { _id: '$categoryId', count: { $sum: 1 } } },
      {
        $lookup: {
          from: 'issuecategories',
          localField: '_id',
          foreignField: '_id',
          as: 'category',
        },
      },
      { $unwind: '$category' },
      { $project: { name: '$category.name', icon: '$category.icon', count: 1 } },
      { $sort: { count: -1 } },
    ]);
    res.json({ success: true, data: { chart: data } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch category data' });
  }
};

// GET /api/admin/analytics/by-severity
export const getReportsBySeverity = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = await Report.aggregate([
      { $group: { _id: '$severity', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    res.json({ success: true, data: { chart: data } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch severity data' });
  }
};

// GET /api/admin/analytics/heatmap
export const getHeatmapData = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = await Report.aggregate([
      {
        $match: {
          status: { $nin: [ReportStatus.REJECTED, ReportStatus.DUPLICATE] },
        },
      },
      {
        $group: {
          _id: '$location.area',
          count: { $sum: 1 },
          city: { $first: '$location.city' },
          district: { $first: '$location.district' },
          avgLat: { $avg: { $arrayElemAt: ['$location.coordinates', 1] } },
          avgLng: { $avg: { $arrayElemAt: ['$location.coordinates', 0] } },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 50 },
    ]);
    res.json({ success: true, data: { heatmap: data } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch heatmap' });
  }
};

// GET /api/admin/analytics/department-performance
export const getDepartmentPerformance = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = await Report.aggregate([
      { $match: { departmentId: { $exists: true } } },
      {
        $group: {
          _id: '$departmentId',
          total: { $sum: 1 },
          resolved: {
            $sum: {
              $cond: [{ $in: ['$status', [ReportStatus.RESOLVED, ReportStatus.CLOSED]] }, 1, 0],
            },
          },
          slaBreach: { $sum: { $cond: ['$isSlaBreach', 1, 0] } },
        },
      },
      {
        $lookup: {
          from: 'departments',
          localField: '_id',
          foreignField: '_id',
          as: 'department',
        },
      },
      { $unwind: '$department' },
      {
        $project: {
          name: '$department.name',
          total: 1,
          resolved: 1,
          slaBreach: 1,
          resolutionRate: {
            $round: [{ $multiply: [{ $divide: ['$resolved', { $max: ['$total', 1] }] }, 100] }, 1],
          },
        },
      },
      { $sort: { total: -1 } },
    ]);
    res.json({ success: true, data: { departments: data } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch department performance' });
  }
};
