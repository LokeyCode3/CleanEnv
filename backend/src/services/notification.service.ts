import { Types } from 'mongoose';
import { Notification } from '../models/Notification';
import { NotificationType } from '../types';

interface NotifyPayload {
  userId: Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  reportId?: Types.ObjectId;
}

export const createNotification = async (payload: NotifyPayload): Promise<void> => {
  try {
    await Notification.create(payload);
    // TODO: Push via FCM / Socket.IO
  } catch (err) {
    console.error('Failed to create notification:', err);
  }
};

export const notifyReportSubmitted = async (
  userId: Types.ObjectId,
  reportId: Types.ObjectId,
  reportIdStr: string
): Promise<void> => {
  await createNotification({
    userId,
    type: NotificationType.REPORT_SUBMITTED,
    title: 'Report Submitted',
    message: `Your report ${reportIdStr} has been submitted successfully. We'll review it shortly.`,
    reportId,
  });
};

export const notifyStatusChange = async (
  userId: Types.ObjectId,
  reportId: Types.ObjectId,
  reportIdStr: string,
  newStatus: string
): Promise<void> => {
  const statusMessages: Record<string, { title: string; message: string; type: NotificationType }> = {
    verified: {
      title: 'Report Verified',
      message: `Your report ${reportIdStr} has been verified by our team.`,
      type: NotificationType.REPORT_VERIFIED,
    },
    rejected: {
      title: 'Report Rejected',
      message: `Your report ${reportIdStr} was rejected. Check the app for details.`,
      type: NotificationType.REPORT_REJECTED,
    },
    assigned: {
      title: 'Report Assigned',
      message: `Your report ${reportIdStr} has been assigned to the relevant department.`,
      type: NotificationType.REPORT_ASSIGNED,
    },
    work_in_progress: {
      title: 'Work Started',
      message: `Work has started on your report ${reportIdStr}.`,
      type: NotificationType.WORK_STARTED,
    },
    resolved: {
      title: 'Issue Resolved',
      message: `Great news! Your report ${reportIdStr} has been resolved.`,
      type: NotificationType.REPORT_RESOLVED,
    },
    closed: {
      title: 'Report Closed',
      message: `Your report ${reportIdStr} has been closed.`,
      type: NotificationType.REPORT_CLOSED,
    },
  };

  const info = statusMessages[newStatus];
  if (info) {
    await createNotification({ userId, ...info, reportId });
  }
};
