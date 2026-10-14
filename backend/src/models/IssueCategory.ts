import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IIssueCategory extends Document {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
  defaultDepartmentId?: Types.ObjectId;
  slaHours: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const IssueCategorySchema = new Schema<IIssueCategory>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String, required: true },
    icon: { type: String, default: '🔧' },
    color: { type: String, default: '#6B7280' },
    defaultDepartmentId: { type: Schema.Types.ObjectId, ref: 'Department' },
    slaHours: {
      low: { type: Number, default: 168 },      // 7 days
      medium: { type: Number, default: 72 },    // 3 days
      high: { type: Number, default: 48 },      // 2 days
      critical: { type: Number, default: 24 },  // 1 day
    },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

IssueCategorySchema.index({ slug: 1 });
IssueCategorySchema.index({ isActive: 1 });

export const IssueCategory = mongoose.model<IIssueCategory>(
  'IssueCategory',
  IssueCategorySchema
);
