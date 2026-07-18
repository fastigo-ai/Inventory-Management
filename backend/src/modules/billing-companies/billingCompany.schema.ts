import mongoose, { Schema, Document } from 'mongoose';

export interface IBillingCompany extends Document {
  name: string;
  address: string;
  phone?: string;
  email?: string;
  logoUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const billingCompanySchema = new Schema<IBillingCompany>(
  {
    name: { type: String, required: true },
    address: { type: String, required: true },
    phone: { type: String },
    email: { type: String },
    logoUrl: { type: String },
  },
  {
    timestamps: true,
  }
);

export const BillingCompany = mongoose.models.BillingCompany || mongoose.model<IBillingCompany>('BillingCompany', billingCompanySchema);
