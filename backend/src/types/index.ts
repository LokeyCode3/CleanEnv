import { Request } from 'express';
import { Document, Types } from 'mongoose';

// ─── Enums ────────────────────────────────────────────────────────────────────

export enum UserRole {
  CITIZEN = 'citizen',
  OFFICER = 'officer',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin',
}

export enum ReportStatus {
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  VERIFIED = 'verified',
  ASSIGNED = 'assigned',
  WORK_IN_PROGRESS = 'work_in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
  REJECTED = 'rejected',
  DUPLICATE = 'duplicate',
}

export enum Severity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum NotificationType {
  REPORT_SUBMITTED = 'report_submitted',
  REPORT_VERIFIED = 'report_verified',
  REPORT_REJECTED = 'report_rejected',
  REPORT_ASSIGNED = 'report_assigned',
  WORK_STARTED = 'work_started',
  REPORT_RESOLVED = 'report_resolved',
  REPORT_CLOSED = 'report_closed',
  INFO_REQUESTED = 'info_requested',
  SLA_BREACH = 'sla_breach',
  NEW_CRITICAL = 'new_critical',
  STATUS_CHANGED = 'status_changed',
}

export enum AuditAction {
  REPORT_CREATED = 'report_created',
  REPORT_VERIFIED = 'report_verified',
  REPORT_REJECTED = 'report_rejected',
  STATUS_CHANGED = 'status_changed',
  DEPARTMENT_ASSIGNED = 'department_assigned',
  OFFICER_ASSIGNED = 'officer_assigned',
  SEVERITY_CHANGED = 'severity_changed',
  DUPLICATE_MARKED = 'duplicate_marked',
  RESOLUTION_SUBMITTED = 'resolution_submitted',
  RESOLUTION_APPROVED = 'resolution_approved',
  USER_CREATED = 'user_created',
  USER_UPDATED = 'user_updated',
  USER_DELETED = 'user_deleted',
  REPORT_DELETED = 'report_deleted',
  PERMISSION_CHANGED = 'permission_changed',
  LOGIN = 'login',
  LOGOUT = 'logout',
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface JwtPayload {
  userId: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: UserRole;
  };
}

// ─── Location ─────────────────────────────────────────────────────────────────

export interface ILocation {
  type: 'Point';
  coordinates: [number, number]; // [lng, lat]
  address: string;
  area: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
  landmark?: string;
}

// ─── Attachment ───────────────────────────────────────────────────────────────

export interface IAttachment {
  url: string;
  publicId: string;
  type: 'image' | 'video';
  isPrimary: boolean;
  uploadedAt: Date;
  uploadedBy: Types.ObjectId;
}

// ─── Status History ───────────────────────────────────────────────────────────

export interface IStatusHistory {
  status: ReportStatus;
  changedBy: Types.ObjectId;
  changedByRole: UserRole;
  comment?: string;
  timestamp: Date;
}

// ─── Resolution ───────────────────────────────────────────────────────────────

export interface IResolution {
  description: string;
  resolvedBy: Types.ObjectId;
  resolvedAt: Date;
  verifiedBy?: Types.ObjectId;
  verifiedAt?: Date;
  beforeImages: string[];
  afterImages: string[];
}

// ─── SLA ──────────────────────────────────────────────────────────────────────

export interface ISlaConfig {
  categoryId: Types.ObjectId;
  severity: Severity;
  resolutionHours: number;
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

// ─── API Response ─────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  errors?: Record<string, string>;
}
