import mongoose, { Schema, Document } from 'mongoose';

export interface IPrLineItem {
  itemId?: mongoose.Types.ObjectId;
  loaSerialNo?: string;
  itemName: string;
  itemDescription?: string;
  tempCode?: string;
  poQuantity: number;
  invoiceQuantity: number;
  srt: number;
  act: number;
  totalInvoiceQuantity: number;
  package?: string;
  circle?: string;
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
  billingFrom?: string;
  
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
  loaSerialNo: { type: String },
  itemName: { type: String, required: true },
  itemDescription: { type: String },
  tempCode: { type: String },
  poQuantity: { type: Number, required: true, default: 0 },
  invoiceQuantity: { type: Number, required: true, default: 0 },
  srt: { type: Number, required: true, default: 0 },
  act: { type: Number, required: true, default: 0 },
  totalInvoiceQuantity: { type: Number, required: true, default: 0 },
  package: { type: String },
  circle: { type: String },
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
    billingFrom: { type: String },
    
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
