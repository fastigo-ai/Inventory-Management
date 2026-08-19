import mongoose, { Schema, Document } from 'mongoose';

export interface IStoreInwardPackingList {
  packType: 'DRUM' | 'PACKAGE' | 'PACKET' | 'BOX' | 'BAG' | 'OTHER';
  label?: string;
  quantity: number;
}

export interface IStoreInwardEntry extends Document {
  inwardId?: string;
  diId?: mongoose.Types.ObjectId;
  purchaseOrderId: mongoose.Types.ObjectId;
  purchaseInvoiceId: mongoose.Types.ObjectId;
  
  poNumber?: string;
  poDate?: Date;
  billingFrom?: string;
  vendorName?: string;
  invoiceNumber?: string;
  invoiceDate?: Date;
  receivedDate?: Date;
  unit?: string;
  invoiceQty?: number;
  totalQty?: number;
  challanQty?: number;
  rejectedQty?: number;
  rate?: number;
  amount?: number;
  taxableAmount?: number;
  
  tempCode?: string;
  itemId?: mongoose.Types.ObjectId;
  itemName?: string;
  itemDescription?: string;
  hsnCode?: string;
  challanNumber?: string;
  transportName?: string;
  truckNumber?: string;
  grNumber?: string;
  grDate?: Date;
  biltyNumber?: string;
  
  gst?: string;
  cgst?: number;
  sgst?: number;
  igst?: number;
  
  diRefNo?: string;
  remarks?: string;
  
  circle?: string;
  subcircle?: string;
  package?: string;
  serialNumber?: string;
  
  status: 'DRAFT' | 'PENDING_RECEIPT' | 'APPROVED' | 'SUBMITTED' | 'VERIFIED' | 'NEEDS_CORRECTION' | 'VOIDED';
  
  packingList: IStoreInwardPackingList[];
  
  auditLogs?: {
    action: 'EDIT' | 'VOID';
    reason: string;
    user: mongoose.Types.ObjectId;
    timestamp: Date;
  }[];
  
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const packingListSchema = new Schema<IStoreInwardPackingList>({
  packType: { 
    type: String, 
    enum: ['DRUM', 'PACKAGE', 'PACKET', 'BOX', 'BAG', 'OTHER'], 
    required: true 
  },
  label: { type: String },
  quantity: { type: Number, required: true, min: 0 }
});

const storeInwardEntrySchema = new Schema<IStoreInwardEntry>(
  {
    inwardId: { type: String, index: true },
    diId: { type: Schema.Types.ObjectId, ref: 'DI', index: true },
    purchaseOrderId: { type: Schema.Types.ObjectId, ref: 'PurchaseOrder', index: true },
    purchaseInvoiceId: { type: Schema.Types.ObjectId, ref: 'PurchaseInvoice', index: true },
    
    poNumber: { type: String, index: true },
    poDate: { type: Date },
    billingFrom: { type: String },
    vendorName: { type: String, index: true },
    invoiceNumber: { type: String, index: true },
    invoiceDate: { type: Date },
    receivedDate: { type: Date },
    unit: { type: String },
    invoiceQty: { type: Number },
    totalQty: { type: Number },
    challanQty: { type: Number },
    rejectedQty: { type: Number },
    rate: { type: Number },
    amount: { type: Number },
    taxableAmount: { type: Number },
    
    tempCode: { type: String, index: true },
    itemId: { type: Schema.Types.ObjectId, ref: 'Item', index: true },
    itemName: { type: String },
    itemDescription: { type: String },
    hsnCode: { type: String },
    challanNumber: { type: String, index: true },
    transportName: { type: String },
    truckNumber: { type: String },
    grNumber: { type: String },
    grDate: { type: Date },
    biltyNumber: { type: String },
    
    gst: { type: String },
    cgst: { type: Number },
    sgst: { type: Number },
    igst: { type: Number },
    
    diRefNo: { type: String },
    remarks: { type: String },
    
    circle: { type: String },
    subcircle: { type: String },
    package: { type: String },
    serialNumber: { type: String },
    
    status: { 
      type: String, 
      enum: ['DRAFT', 'PENDING_RECEIPT', 'APPROVED', 'SUBMITTED', 'VERIFIED', 'NEEDS_CORRECTION', 'VOIDED'], 
      default: 'DRAFT',
      index: true
    },
    
    packingList: [packingListSchema],
    
    auditLogs: [{
      action: { type: String, enum: ['EDIT', 'VOID'], required: true },
      reason: { type: String, required: true },
      user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
      timestamp: { type: Date, default: Date.now }
    }],
    
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

storeInwardEntrySchema.index({ createdAt: -1 });

export const StoreInwardEntry = mongoose.models.StoreInwardEntry || mongoose.model<IStoreInwardEntry>('StoreInwardEntry', storeInwardEntrySchema);
