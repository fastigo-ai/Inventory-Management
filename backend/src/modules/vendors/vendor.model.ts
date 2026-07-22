import mongoose, { Schema, Document } from 'mongoose';

export interface IVendor extends Document {
  dynamicData: Record<string, any>;
  isDeleted: boolean;
  status: 'Active' | 'Inactive';
}

const VendorSchema = new Schema({
  dynamicData: { type: Schema.Types.Mixed, required: true },
  isDeleted: { type: Boolean, default: false },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' }
}, { timestamps: true });

export default mongoose.model<IVendor>('Vendor', VendorSchema);
