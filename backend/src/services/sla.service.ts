import { Types } from 'mongoose';
import { IssueCategory } from '../models/IssueCategory';
import { Report } from '../models/Report';
import { Severity } from '../types';
import { addHours } from 'date-fns';

export const calculateSlaDeadline = async (
  categoryId: Types.ObjectId,
  severity: Severity
): Promise<Date> => {
  const category = await IssueCategory.findById(categoryId).lean();
  const hours = category?.slaHours?.[severity] ?? 72;
  return addHours(new Date(), hours);
};

// Called by cron job — marks overdue reports
export const checkSlaBreaches = async (): Promise<void> => {
  const now = new Date();
  await Report.updateMany(
    {
      slaDeadline: { $lt: now },
      isSlaBreach: false,
      status: { $nin: ['resolved', 'closed', 'rejected', 'duplicate'] },
    },
    { $set: { isSlaBreach: true } }
  );
};
