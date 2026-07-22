import mongoose, { Schema, Document } from 'mongoose';

export interface IPurchaseOrderLineItem {
  itemId?: mongoose.Types.ObjectId;
  itemName: string;
  tempCode?: string;
  account?: string;
  description?: string;
  loaSerialNo?: string;
  hsnCode?: string;
  package?: string;
  circle?: string;
  unit?: string;
  quantity: number;
  rate: number;
  amount: number;
  isCanceled?: boolean;
}

export interface IPurchaseOrder extends Document {
  vendorName: string;
  location?: string;
  deliveryAddressType?: 'Locations' | 'Customer';
  deliveryAddressId?: string;
  deliveryAddresses?: string[];
  purchaseOrderNumber: string;
  reference?: string;
  billingCompany?: {
    name: string;
    address: string;
    phone?: string;
    email?: string;
    logoUrl?: string;
  };
  date: Date;
  deliveryDate?: Date;
  paymentTerms?: {
    stage: string;
    type: string;
    value: string;
    unit: string;
    remark?: string;
  }[];
  poQuantity?: string;
  circle?: string;
  package?: string;
  shipmentPreference?: string;
  
  // Table
  warehouseLocation?: string;
  lineItems: IPurchaseOrderLineItem[];
  
  // Notes
  notes?: string;
  termsConditions?: string;

  // Financials
  subTotal: number;
  cgstPercentage?: number;
  sgstPercentage?: number;
  igstPercentage?: number;
  gstTreatment?: string;
  freightInsuranceType?: string;
  freightInsuranceValueType?: string;
  freightInsuranceAmount?: number;
  discountPercentage?: number;
  discountAmount?: number;
  taxType?: 'TDS' | 'TCS';
  taxPercentage?: number;
  taxAmount?: number;
  adjustment?: number;
  total: number;
  
  status: 'Draft' | 'Sent' | 'Cancelled';
  receiveStatus: 'Yet To Be Received' | 'Received';
  
  
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
  description: { type: String },
  loaSerialNo: { type: String },
  hsnCode: { type: String },
  package: { type: String },
  circle: { type: String },
  unit: { type: String },
  quantity: { type: Number, required: true, default: 1 },
  rate: { type: Number, required: true, default: 0 },
  amount: { type: Number, required: true, default: 0 },
  isCanceled: { type: Boolean, default: false },
});

const purchaseOrderSchema = new Schema<IPurchaseOrder>(
  {
    vendorName: { type: String, required: true },
    location: { type: String },
    deliveryAddressType: { type: String, enum: ['Locations', 'Customer'] },
    deliveryAddressId: { type: String },
    deliveryAddresses: [{ type: String }],
    purchaseOrderNumber: { type: String, required: true, unique: true },
    reference: { type: String },
    billingCompany: {
      name: { type: String },
      address: { type: String },
      phone: { type: String },
      email: { type: String },
      logoUrl: { type: String },
    },
    date: { type: Date, required: true, default: Date.now },
    deliveryDate: { type: Date },
    paymentTerms: [{
      stage: { type: String },
      type: { type: String },
      value: { type: String },
      unit: { type: String },
      remark: { type: String }
    }],
    poQuantity: { type: String },
    circle: { type: String },
    package: { type: String },
    shipmentPreference: { type: String },
    
    warehouseLocation: { type: String },
    lineItems: [purchaseOrderLineItemSchema],
    
    notes: { type: String },
    termsConditions: { type: String },
    
    subTotal: { type: Number, required: true, default: 0 },
    cgstPercentage: { type: Number, default: 0 },
    sgstPercentage: { type: Number, default: 0 },
    igstPercentage: { type: Number, default: 0 },
    gstTreatment: { type: String, enum: ['intra_state', 'inter_state'], default: 'intra_state' },
    freightInsuranceType: { type: String },
    freightInsuranceValueType: { type: String },
    freightInsuranceAmount: { type: Number, default: 0 },
    discountPercentage: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    taxType: { type: String, enum: ['TDS', 'TCS'] },
    taxPercentage: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    adjustment: { type: Number, default: 0 },
    total: { type: Number, required: true, default: 0 },
    
    status: { type: String, enum: ['Draft', 'Sent', 'Cancelled'], default: 'Draft' },
    receiveStatus: { type: String, enum: ['Yet To Be Received', 'Received'], default: 'Yet To Be Received' },
    
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
