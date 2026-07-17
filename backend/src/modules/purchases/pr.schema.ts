import mongoose, { Schema, Document } from 'mongoose';

export interface IPrLineItem {
  itemId?: mongoose.Types.ObjectId;
  itemName: string;
  tempCode?: string;
  ordered: number;
  received: number;
  inTransit: number;
  quantityToReceive: number;
  package?: string;
  subPackage?: string;
  unit?: string;
  rate?: number;
  amount?: number;
}

export interface IPr extends Document {
  vendorName: string;
  purchaseOrderId?: mongoose.Types.ObjectId;
  purchaseOrderNumber?: string;
  purchaseReceiveNumber: string;
  receiveDate: Date;
  diNo?: string;
  diDate?: Date;
  
  // Table
  lineItems: IPrLineItem[];
  
  // Metadata
  notes?: string;
  status: 'Draft' | 'Received' | 'In Transit';
  billed: boolean;
  
  attachments?: {
    name: string;
    url: string;
  }[];
  
  createdAt: Date;
  updatedAt: Date;
}

const prLineItemSchema = new Schema<IPrLineItem>({
  itemId: { type: Schema.Types.ObjectId, ref: 'Item' },
  itemName: { type: String, required: true },
  tempCode: { type: String },
  ordered: { type: Number, required: true, default: 0 },
  received: { type: Number, required: true, default: 0 },
  inTransit: { type: Number, required: true, default: 0 },
  quantityToReceive: { type: Number, required: true, default: 0 },
  package: { type: String },
  subPackage: { type: String },
  unit: { type: String },
  rate: { type: Number, default: 0 },
  amount: { type: Number, default: 0 },
});

const prSchema = new Schema<IPr>(
  {
    vendorName: { type: String, required: true },
    purchaseOrderId: { type: Schema.Types.ObjectId, ref: 'PurchaseOrder' },
    purchaseOrderNumber: { type: String },
    purchaseReceiveNumber: { type: String, required: true, unique: true },
    receiveDate: { type: Date, required: true },
    diNo: { type: String },
    diDate: { type: Date },
    
    lineItems: [prLineItemSchema],
    
    notes: { type: String },
    
    status: { type: String, enum: ['Draft', 'Received', 'In Transit'], default: 'Draft' },
    billed: { type: Boolean, default: false },
    
    attachments: [{
      name: { type: String },
      url: { type: String }
    }],
  },
  {
    timestamps: true,
  }
);

export const Pr = mongoose.models.Pr || mongoose.model<IPr>('Pr', prSchema);
