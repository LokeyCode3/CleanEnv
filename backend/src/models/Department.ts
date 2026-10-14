import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IDepartment extends Document {
  _id: Types.ObjectId;
  name: string;
  code: string;
  description: string;
  headName?: string;
  headEmail?: string;
  headPhone?: string;
  jurisdictions: {
    states: string[];
    districts: string[];
    cities: string[];
    wards: string[];
  };
  categoryIds: Types.ObjectId[];
  isActive: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DepartmentSchema = new Schema<IDepartment>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true },
    description: { type: String, default: '' },
    headName: { type: String },
    headEmail: { type: String },
    headPhone: { type: String },
    jurisdictions: {
      states: [{ type: String }],
      districts: [{ type: String }],
      cities: [{ type: String }],
      wards: [{ type: String }],
    },
    categoryIds: [{ type: Schema.Types.ObjectId, ref: 'IssueCategory' }],
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

DepartmentSchema.index({ code: 1 });
DepartmentSchema.index({ isActive: 1 });
DepartmentSchema.pre(/^find/, function (this: mongoose.Query<unknown, IDepartment>, next) {
  this.find({ isDeleted: { $ne: true } });
  next();
});

export const Department = mongoose.model<IDepartment>(
  'Department',
  DepartmentSchema
);
