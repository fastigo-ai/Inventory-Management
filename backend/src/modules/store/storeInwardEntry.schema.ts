import mongoose, { Schema, Document } from 'mongoose';

export interface IStoreInwardPackingList {
  packType: 'DRUM' | 'PACKAGE' | 'PACKET' | 'BOX' | 'BAG' | 'OTHER';
  label?: string;
  quantity: number;
}

export interface IStoreInwardEntry extends Document {
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
  package?: string;
  serialNumber?: string;
  
  status: 'DRAFT' | 'SUBMITTED' | 'VERIFIED' | 'NEEDS_CORRECTION';
  
  packingList: IStoreInwardPackingList[];
  
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
    diId: { type: Schema.Types.ObjectId, ref: 'DI' },
    purchaseOrderId: { type: Schema.Types.ObjectId, ref: 'PurchaseOrder', required: true },
    purchaseInvoiceId: { type: Schema.Types.ObjectId, ref: 'PurchaseInvoice', required: true },
    
    poNumber: { type: String },
    poDate: { type: Date },
    billingFrom: { type: String },
    vendorName: { type: String },
    invoiceNumber: { type: String },
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
    
    tempCode: { type: String },
    hsnCode: { type: String },
    challanNumber: { type: String },
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
    package: { type: String },
    serialNumber: { type: String },
    
    status: { 
      type: String, 
      enum: ['DRAFT', 'SUBMITTED', 'VERIFIED', 'NEEDS_CORRECTION'], 
      default: 'DRAFT' 
    },
    
    packingList: [packingListSchema],
    
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

export const StoreInwardEntry = mongoose.models.StoreInwardEntry || mongoose.model<IStoreInwardEntry>('StoreInwardEntry', storeInwardEntrySchema);
