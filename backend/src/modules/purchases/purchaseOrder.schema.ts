import mongoose, { Schema, Document } from 'mongoose';

export interface IPurchaseOrderLineItem {
  itemId?: mongoose.Types.ObjectId;
  itemName: string;
  tempCode?: string;
  account?: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface IPurchaseOrder extends Document {
  vendorName: string;
  location?: string;
  deliveryAddressType?: 'Locations' | 'Customer';
  deliveryAddressId?: string;
  purchaseOrderNumber: string;
  reference?: string;
  date: Date;
  deliveryDate?: Date;
  paymentTerms?: string;
  poQuantity?: string;
  circle?: string;
  package1?: string;
  package2?: string;
  shipmentPreference?: string;
  
  // Table
  warehouseLocation?: string;
  lineItems: IPurchaseOrderLineItem[];
  
  // Notes
  notes?: string;
  termsConditions?: string;

  // Financials
  subTotal: number;
  discountPercentage?: number;
  discountAmount?: number;
  taxType?: 'TDS' | 'TCS';
  taxPercentage?: number;
  taxAmount?: number;
  adjustment?: number;
  total: number;
  
  status: 'Draft' | 'Sent' | 'Cancelled';
  
  attachments?: {
    name: string;
    url: string;
  }[];
  
  createdAt: Date;
  updatedAt: Date;
}

const purchaseOrderLineItemSchema = new Schema<IPurchaseOrderLineItem>({
  itemId: { type: Schema.Types.ObjectId, ref: 'Item' },
  itemName: { type: String, required: true },
  tempCode: { type: String },
  account: { type: String },
  quantity: { type: Number, required: true, default: 1 },
  rate: { type: Number, required: true, default: 0 },
  amount: { type: Number, required: true, default: 0 },
});

const purchaseOrderSchema = new Schema<IPurchaseOrder>(
  {
    vendorName: { type: String, required: true },
    location: { type: String },
    deliveryAddressType: { type: String, enum: ['Locations', 'Customer'] },
    deliveryAddressId: { type: String },
    purchaseOrderNumber: { type: String, required: true, unique: true },
    reference: { type: String },
    date: { type: Date, required: true, default: Date.now },
    deliveryDate: { type: Date },
    paymentTerms: { type: String },
    poQuantity: { type: String },
    circle: { type: String },
    package1: { type: String },
    package2: { type: String },
    shipmentPreference: { type: String },
    
    warehouseLocation: { type: String },
    lineItems: [purchaseOrderLineItemSchema],
    
    notes: { type: String },
    termsConditions: { type: String },
    
    subTotal: { type: Number, required: true, default: 0 },
    discountPercentage: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    taxType: { type: String, enum: ['TDS', 'TCS'] },
    taxPercentage: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    adjustment: { type: Number, default: 0 },
    total: { type: Number, required: true, default: 0 },
    
    status: { type: String, enum: ['Draft', 'Sent', 'Cancelled'], default: 'Draft' },
    
    attachments: [{
      name: { type: String },
      url: { type: String }
    }],
  },
  {
    timestamps: true,
  }
);

export const PurchaseOrder = mongoose.models.PurchaseOrder || mongoose.model<IPurchaseOrder>('PurchaseOrder', purchaseOrderSchema);
