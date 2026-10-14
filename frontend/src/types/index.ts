export type UserRole = 'citizen' | 'officer' | 'admin' | 'super_admin';

export type ReportStatus =
  | 'submitted'
  | 'under_review'
  | 'verified'
  | 'assigned'
  | 'work_in_progress'
  | 'resolved'
  | 'closed'
  | 'rejected'
  | 'duplicate';

export type Severity = 'low' | 'medium' | 'high' | 'critical';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  avatar?: string;
  isVerified: boolean;
  isActive: boolean;
  departmentId?: string | Department;
  jurisdictions?: {
    states: string[];
    districts: string[];
    cities: string[];
    wards: string[];
  };
  createdAt: string;
}

export interface IssueCategory {
  _id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
  slaHours: { low: number; medium: number; high: number; critical: number };
  sortOrder: number;
}

export interface Department {
  _id: string;
  name: string;
  code: string;
  description: string;
  headName?: string;
  isActive: boolean;
}

export interface Attachment {
  _id: string;
  url: string;
  publicId: string;
  type: 'image' | 'video';
  isPrimary: boolean;
  uploadedAt: string;
}

export interface StatusHistory {
  _id: string;
  status: ReportStatus;
  changedBy: { name: string; role: UserRole } | string;
  changedByRole: UserRole;
  comment?: string;
  timestamp: string;
}

export interface Comment {
  _id: string;
  text: string;
  addedBy: { name: string; role: UserRole } | string;
  addedByRole: UserRole;
  isPublic: boolean;
  createdAt: string;
}

export interface Resolution {
  description: string;
  resolvedBy: string;
  resolvedAt: string;
  verifiedBy?: string;
  verifiedAt?: string;
  beforeImages: string[];
  afterImages: string[];
}

export interface Location {
  type: 'Point';
  coordinates: [number, number];
  address: string;
  area: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
  landmark?: string;
}

export interface Report {
  _id: string;
  reportId: string;
  userId: User | string;
  categoryId: IssueCategory | string;
  title: string;
  description: string;
  severity: Severity;
  status: ReportStatus;
  location: Location;
  attachments: Attachment[];
  statusHistory: StatusHistory[];
  internalComments: Comment[];
  resolution?: Resolution;
  departmentId?: Department | string;
  assignedOfficerId?: User | string;
  supportCount: number;
  isDuplicate: boolean;
  parentReportId?: string;
  duplicateReports: string[];
  slaDeadline?: string;
  isSlaBreach: boolean;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  reportId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface DashboardStats {
  total: number;
  submitted: number;
  underReview: number;
  verified: number;
  assigned: number;
  wip: number;
  resolved: number;
  rejected: number;
  critical: number;
  slaBreach: number;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  pages: number;
}
