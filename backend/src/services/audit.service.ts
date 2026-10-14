import { Types } from 'mongoose';
import { AuditLog } from '../models/AuditLog';
import { AuditAction, UserRole } from '../types';
import { AuthRequest } from '../types';

export const createAuditLog = async (params: {
  action: AuditAction;
  performedBy: Types.ObjectId;
  performedByRole: UserRole;
  targetModel: string;
  targetId: Types.ObjectId;
  changes?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> => {
  try {
    await AuditLog.create(params);
  } catch (err) {
    console.error('Audit log failed:', err);
  }
};

export const auditFromRequest = (
  req: AuthRequest,
  action: AuditAction,
  targetModel: string,
  targetId: Types.ObjectId,
  changes?: Record<string, unknown>,
  metadata?: Record<string, unknown>
): Promise<void> => {
  if (!req.user) return Promise.resolve();
  return createAuditLog({
    action,
    performedBy: new Types.ObjectId(req.user.userId),
    performedByRole: req.user.role,
    targetModel,
    targetId,
    changes,
    metadata,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });
};
