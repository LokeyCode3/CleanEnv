import mongoose, { Document, Schema, Types } from 'mongoose';
import {
  ReportStatus,
  Severity,
  ILocation,
  IAttachment,
  IStatusHistory,
  IResolution,
  UserRole,
} from '../types';

export interface IReport extends Document {
  _id: Types.ObjectId;
  reportId: string; // CIV-2026-000184
  userId: Types.ObjectId;
  categoryId: Types.ObjectId;
  title: string;
  description: string;
  severity: Severity;
  status: ReportStatus;
  location: ILocation;
  attachments: IAttachment[];
  statusHistory: IStatusHistory[];
  resolution?: IResolution;
  departmentId?: Types.ObjectId;
  assignedOfficerId?: Types.ObjectId;
  // Duplicate/support grouping
  isDuplicate: boolean;
  parentReportId?: Types.ObjectId;
  duplicateReports: Types.ObjectId[];
  supportCount: number;
  // SLA
  slaDeadline?: Date;
  isSlaBreach: boolean;
  // Admin fields
  internalComments: Array<{
    text: string;
    addedBy: Types.ObjectId;
    addedByRole: UserRole;
    isPublic: boolean;
    createdAt: Date;
  }>;
  rejectionReason?: string;
  additionalInfoRequested?: string;
  // Soft delete
  isDeleted: boolean;
  deletedBy?: Types.ObjectId;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const LocationSchema = new Schema<ILocation>(
  {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true }, // [lng, lat]
    address: { type: String, required: true },
    area: { type: String, default: '' },
    city: { type: String, required: true },
    district: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, default: '' },
    landmark: { type: String },
  },
  { _id: false }
);

const AttachmentSchema = new Schema<IAttachment>(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    type: { type: String, enum: ['image', 'video'], default: 'image' },
    isPrimary: { type: Boolean, default: false },
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { _id: true }
);

const StatusHistorySchema = new Schema<IStatusHistory>(
  {
    status: { type: String, enum: Object.values(ReportStatus), required: true },
    changedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    changedByRole: { type: String, enum: Object.values(UserRole), required: true },
    comment: { type: String },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: true }
);

const ResolutionSchema = new Schema<IResolution>(
  {
    description: { type: String, required: true },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    resolvedAt: { type: Date, required: true },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: { type: Date },
    beforeImages: [{ type: String }],
    afterImages: [{ type: String }],
  },
  { _id: false }
);

const ReportSchema = new Schema<IReport>(
  {
    reportId: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'IssueCategory',
      required: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    severity: {
      type: String,
      enum: Object.values(Severity),
      default: Severity.MEDIUM,
    },
    status: {
      type: String,
      enum: Object.values(ReportStatus),
      default: ReportStatus.SUBMITTED,
    },
    location: { type: LocationSchema, required: true },
    attachments: [AttachmentSchema],
    statusHistory: [StatusHistorySchema],
    resolution: ResolutionSchema,
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department' },
    assignedOfficerId: { type: Schema.Types.ObjectId, ref: 'User' },
    isDuplicate: { type: Boolean, default: false },
    parentReportId: { type: Schema.Types.ObjectId, ref: 'Report' },
    duplicateReports: [{ type: Schema.Types.ObjectId, ref: 'Report' }],
    supportCount: { type: Number, default: 0 },
    slaDeadline: { type: Date },
    isSlaBreach: { type: Boolean, default: false },
    internalComments: [
      {
        text: { type: String, required: true },
        addedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        addedByRole: {
          type: String,
          enum: Object.values(UserRole),
          required: true,
        },
        isPublic: { type: Boolean, default: false },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    rejectionReason: { type: String },
    additionalInfoRequested: { type: String },
    isDeleted: { type: Boolean, default: false },
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    deletedAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Geospatial index for nearby queries
ReportSchema.index({ 'location': '2dsphere' });
ReportSchema.index({ reportId: 1 });
ReportSchema.index({ userId: 1 });
ReportSchema.index({ categoryId: 1 });
ReportSchema.index({ departmentId: 1 });
ReportSchema.index({ assignedOfficerId: 1 });
ReportSchema.index({ status: 1 });
ReportSchema.index({ severity: 1 });
ReportSchema.index({ createdAt: -1 });
ReportSchema.index({ isDeleted: 1 });
ReportSchema.index({ 'location.city': 1 });
ReportSchema.index({ 'location.district': 1 });
ReportSchema.index({ isSlaBreach: 1 });

// Soft delete filter
ReportSchema.pre(/^find/, function (this: mongoose.Query<unknown, IReport>, next) {
  this.find({ isDeleted: { $ne: true } });
  next();
});

export const Report = mongoose.model<IReport>('Report', ReportSchema);
