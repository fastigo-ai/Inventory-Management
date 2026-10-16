import mongoose, { Document, Schema } from 'mongoose';

export interface ITransferItem {
  itemId: mongoose.Types.ObjectId;
  tempCode: string;
  description: string;
  unit: string;
  requestedQty: number;
  dispatchedQty: number; // Updated upon dispatch
  receivedQty: number; // Updated upon receipt
  loaSerialNo?: string;
  loaQty?: number;
  itemName?: string;
  name?: string;
  quantity?: number;
}

export interface IStoreTransfer extends Document {
  requestDate: Date;
  registerType?: 'INWARD' | 'OUTWARD';
  status: 'PENDING' | 'Pending PD Approval' | 'Approved' | 'IN_TRANSIT' | 'RECEIVED' | 'REJECTED';
  fromStore: string; // Source Circle/Package
  toStore: string; // Destination Circle/Package
  requestedBy: mongoose.Types.ObjectId;
  vendorName?: string; // Original Supplier

  items: ITransferItem[];

  // Document details (filled upon receipt usually, or at dispatch)
  minBookNo?: string;
  minNo?: string;
  minDate?: Date;
  challanNo?: string;
  challanDate?: Date;

  // Transport details
  transportName?: string;
  truckNumber?: string;
  grNumber?: string;
  grDate?: Date;
  driverName?: string;
  driverMobile?: string;

  remarks?: string;

  // Geographic / Package routing fields for PD Approval
  originCircle?: string; // Solan, Nahan, Rohru, Rampur
  originSubcircle?: string; // Kumarhatti, Nalagarh
  originPackage?: string; // 'Package 1 (S/N)' or 'Package 2 (R/R)'
  destinationCircle?: string;
  destinationSubcircle?: string;
  destinationPackage?: string;

  // PD Approval fields
  pdApprovedBy?: mongoose.Types.ObjectId;
  pdApprovedAt?: Date;
  pdApprovalRemarks?: string;
  rejectedBy?: mongoose.Types.ObjectId;
  rejectedAt?: Date;
  rejectionReason?: string;

  createdAt: Date;
  updatedAt: Date;
}

const transferItemSchema = new Schema<ITransferItem>({
  itemId: { type: Schema.Types.ObjectId, ref: 'Item', required: true, index: true },
  tempCode: { type: String, required: true },
  description: { type: String, required: true },
  unit: { type: String, required: true },
  requestedQty: { type: Number, required: true, min: 0 },
  dispatchedQty: { type: Number, default: 0, min: 0 },
  receivedQty: { type: Number, default: 0, min: 0 },
  loaSerialNo: { type: String },
  loaQty: { type: Number, min: 0 }
}, { _id: true });

const storeTransferSchema = new Schema<IStoreTransfer>({
  requestDate: { type: Date, default: Date.now, required: true },
  registerType: { type: String, enum: ['INWARD', 'OUTWARD'], default: 'INWARD' },
  status: { 
    type: String, 
    enum: ['PENDING', 'Pending PD Approval', 'Approved', 'IN_TRANSIT', 'RECEIVED', 'REJECTED'], 
    default: 'Pending PD Approval',
    required: true,
    index: true
  },
  fromStore: { type: String, required: true },
  toStore: { type: String, required: true },
  requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  vendorName: { type: String },

  items: [transferItemSchema],

  minBookNo: { type: String },
  minNo: { type: String },
  minDate: { type: Date },
  challanNo: { type: String },
  challanDate: { type: Date },

  transportName: { type: String },
  truckNumber: { type: String },
  grNumber: { type: String },
  grDate: { type: Date },
  driverName: { type: String },
  driverMobile: { type: String },

  remarks: { type: String },

  // Geographic / Package routing fields for PD Approval
  originCircle: { type: String, index: true },
  originSubcircle: { type: String },
  originPackage: { type: String, index: true },
  destinationCircle: { type: String },
  destinationSubcircle: { type: String },
  destinationPackage: { type: String },

  pdApprovedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  pdApprovedAt: { type: Date },
  pdApprovalRemarks: { type: String },
  rejectedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  rejectedAt: { type: Date },
  rejectionReason: { type: String }
}, {
  timestamps: true
});

storeTransferSchema.index({ createdAt: -1 });
storeTransferSchema.index({ fromStore: 1, registerType: 1 });
storeTransferSchema.index({ toStore: 1, registerType: 1 });
storeTransferSchema.index({ registerType: 1, status: 1 });

export const StoreTransfer = mongoose.model<IStoreTransfer>('StoreTransfer', storeTransferSchema);
