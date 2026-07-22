import mongoose, { Document, Schema } from 'mongoose';

export interface ITransferItem {
  itemId: mongoose.Types.ObjectId;
  tempCode: string;
  description: string;
  unit: string;
  requestedQty: number;
  dispatchedQty: number; // Updated upon dispatch
  receivedQty: number; // Updated upon receipt
}

export interface IStoreTransfer extends Document {
  requestDate: Date;
  status: 'PENDING' | 'APPROVED' | 'IN_TRANSIT' | 'RECEIVED' | 'REJECTED';
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
  createdAt: Date;
  updatedAt: Date;
}

const transferItemSchema = new Schema<ITransferItem>({
  itemId: { type: Schema.Types.ObjectId, ref: 'Item', required: true },
  tempCode: { type: String, required: true },
  description: { type: String, required: true },
  unit: { type: String, required: true },
  requestedQty: { type: Number, required: true, min: 0 },
  dispatchedQty: { type: Number, default: 0, min: 0 },
  receivedQty: { type: Number, default: 0, min: 0 }
}, { _id: true });

const storeTransferSchema = new Schema<IStoreTransfer>({
  requestDate: { type: Date, default: Date.now, required: true },
  status: { 
    type: String, 
    enum: ['PENDING', 'APPROVED', 'IN_TRANSIT', 'RECEIVED', 'REJECTED'], 
    default: 'PENDING',
    required: true
  },
  fromStore: { type: String, required: true },
  toStore: { type: String, required: true },
  requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
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

  remarks: { type: String }
}, {
  timestamps: true
});

export const StoreTransfer = mongoose.model<IStoreTransfer>('StoreTransfer', storeTransferSchema);
