import mongoose, { Schema, Document } from 'mongoose';

export interface IMhrov extends Document {
  mhrovNumber: string;
  mhrovDate: Date;
  status: string;
  documentUrl?: string;
  package?: string;
  circle?: string;
  inwardEntries: mongoose.Types.ObjectId[];
  createdBy?: mongoose.Types.ObjectId;
}

const mhrovSchema = new Schema(
  {
    mhrovNumber: { type: String, required: true },
    mhrovDate: { type: Date, required: true },
    status: { 
      type: String, 
      required: true,
      enum: ['done', 'pending', 'MHROV done but not signed'],
      default: 'pending',
      index: true
    },
    documentUrl: { type: String },
    package: { type: String },
    circle: { type: String },
    inwardEntries: [{ type: Schema.Types.ObjectId, ref: 'StoreInwardEntry', index: true }],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', index: true }
  },
  { timestamps: true }
);

mhrovSchema.index({ mhrovDate: -1 });
mhrovSchema.index({ createdAt: -1 });

export const Mhrov = mongoose.model<IMhrov>('Mhrov', mhrovSchema);
