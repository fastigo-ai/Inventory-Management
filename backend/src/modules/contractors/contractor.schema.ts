import mongoose, { Schema, Document } from 'mongoose';

export interface IContractor extends Document {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  location?: 'Solan' | 'Nahan' | 'Rampur' | 'Rohru';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const contractorSchema = new Schema<IContractor>(
  {
    name: { type: String, required: true },
    email: { type: String },
    phone: { type: String },
    address: { type: String },
    location: { type: String, enum: ['Solan', 'Nahan', 'Rampur', 'Rohru'] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Contractor = mongoose.models.Contractor || mongoose.model<IContractor>('Contractor', contractorSchema);
