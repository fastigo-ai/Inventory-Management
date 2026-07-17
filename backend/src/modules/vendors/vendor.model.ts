import mongoose, { Schema, Document } from 'mongoose';

export interface IVendor extends Document {
  dynamicData: Record<string, any>;
}

const VendorSchema = new Schema({
  dynamicData: { type: Schema.Types.Mixed, required: true }
}, { timestamps: true });

export default mongoose.model<IVendor>('Vendor', VendorSchema);
