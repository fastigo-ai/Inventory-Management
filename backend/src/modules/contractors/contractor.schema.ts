import mongoose, { Schema, Document } from 'mongoose';

export interface IContractor extends Document {
  dynamicData: Record<string, any>;
  assignedLocations: string[];
  location?: 'Solan' | 'Nahan' | 'Rampur' | 'Rohru';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const contractorSchema = new Schema<IContractor>(
  {
    dynamicData: { type: Schema.Types.Mixed, required: true },
    assignedLocations: { type: [String], default: [] },
    location: { type: String, enum: ['Solan', 'Nahan', 'Rampur', 'Rohru'] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Contractor = mongoose.models.Contractor || mongoose.model<IContractor>('Contractor', contractorSchema);

