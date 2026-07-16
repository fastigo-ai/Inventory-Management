import mongoose, { Schema, Document } from 'mongoose';

export interface ILocation extends Document {
  name: string;
  parentLocation?: mongoose.Types.ObjectId;
  type: 'Head Office' | 'Warehouse' | 'Store' | 'Other';
  address?: string;
  contactPerson?: string;
  phone?: string;
  status: 'Active' | 'Inactive';
  createdAt: Date;
  updatedAt: Date;
}

const locationSchema = new Schema<ILocation>(
  {
    name: { type: String, required: true },
    parentLocation: { type: Schema.Types.ObjectId, ref: 'Location' },
    type: { type: String, enum: ['Head Office', 'Warehouse', 'Store', 'Other'], default: 'Warehouse' },
    address: { type: String },
    contactPerson: { type: String },
    phone: { type: String },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  },
  {
    timestamps: true,
  }
);

export const Location = mongoose.models.Location || mongoose.model<ILocation>('Location', locationSchema);
