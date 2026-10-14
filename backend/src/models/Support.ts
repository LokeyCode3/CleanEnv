import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ISupport extends Document {
  _id: Types.ObjectId;
  reportId: Types.ObjectId;
  userId: Types.ObjectId;
  createdAt: Date;
}

const SupportSchema = new Schema<ISupport>(
  {
    reportId: {
      type: Schema.Types.ObjectId,
      ref: 'Report',
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

SupportSchema.index({ reportId: 1, userId: 1 }, { unique: true });

export const Support = mongoose.model<ISupport>('Support', SupportSchema);
