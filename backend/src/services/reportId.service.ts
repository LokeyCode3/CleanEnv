import { Report } from '../models/Report';

export const generateReportId = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const prefix = `CIV-${year}-`;

  // Find the latest report for this year
  const latest = await Report.findOne(
    { reportId: { $regex: `^${prefix}` } },
    { reportId: 1 },
    { sort: { reportId: -1 } }
  ).lean();

  let nextNum = 1;
  if (latest) {
    const parts = latest.reportId.split('-');
    nextNum = parseInt(parts[parts.length - 1], 10) + 1;
  }

  return `${prefix}${String(nextNum).padStart(6, '0')}`;
};
