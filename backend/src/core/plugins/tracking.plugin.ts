import mongoose, { Schema } from 'mongoose';
import { getContext } from '../utils/context';

export interface ITrackingPlugin {
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  isDeleted?: boolean;
  deletedBy?: mongoose.Types.ObjectId;
  deletedAt?: Date;
}

export function trackingPlugin(schema: Schema) {
  // Add schema fields
  schema.add({
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    isDeleted: { type: Boolean, default: false },
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    deletedAt: { type: Date }
  });

  // Auto-populate user for save
  schema.pre('save', async function (this: any) {
    const ctx = getContext();
    if (ctx?.userId) {
      const userId = new mongoose.Types.ObjectId(ctx.userId);
      if (this.isNew) {
        this.createdBy = userId;
      }
      this.updatedBy = userId;
    }
  });

  // Auto-populate user for update operations
  const setUpdatedBy = async function (this: any) {
    const ctx = getContext();
    if (ctx?.userId) {
      const userId = new mongoose.Types.ObjectId(ctx.userId);
      this.set({ updatedBy: userId });
    }
  };

  schema.pre('findOneAndUpdate', setUpdatedBy as any);
  schema.pre('updateOne', setUpdatedBy as any);
  schema.pre('updateMany', setUpdatedBy as any);
}
