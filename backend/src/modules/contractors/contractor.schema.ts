import mongoose, { Schema, Document } from 'mongoose';

export interface IContractor extends Document {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
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
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Contractor = mongoose.models.Contractor || mongoose.model<IContractor>('Contractor', contractorSchema);
