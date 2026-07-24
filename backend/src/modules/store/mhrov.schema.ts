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
      default: 'pending'
    },
    documentUrl: { type: String },
    package: { type: String },
    circle: { type: String },
    inwardEntries: [{ type: Schema.Types.ObjectId, ref: 'StoreInwardEntry' }],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

export const Mhrov = mongoose.model<IMhrov>('Mhrov', mhrovSchema);
