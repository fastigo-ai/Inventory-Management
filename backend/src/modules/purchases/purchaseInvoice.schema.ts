import mongoose, { Schema, Document } from 'mongoose';

export interface IPurchaseInvoiceLineItem {
  itemId?: mongoose.Types.ObjectId;
  itemName: string;
  description?: string;
  loaSerialNo?: string;
  hsnCode?: string;
  package?: string;
  circle?: string;
  subcircle?: string;
  tempCode?: string;
  diId?: mongoose.Types.ObjectId;
  diLineId?: mongoose.Types.ObjectId;
  poQuantity?: number;
  diQuantity?: number;
  srt?: number;
  act?: number;
  totalInventory?: number;
  unit?: string;
  cgst?: number;
  sgst?: number;
  igst?: number;
  quantity: number;
  rate: number;
  amount: number;
  poDate?: Date | string;
  totalAmount?: number;
  gstType?: 'Intra State' | 'Inter State';
}

export interface IPurchaseInvoice extends Document {
  invoiceNumber: string;
  vendorName: string;
  purchaseOrderId?: mongoose.Types.ObjectId;
  purchaseOrderNumber?: string;
  date: Date;
  dueDate?: Date;
  
  billingCompany?: {
    name: string;
    address: string;
    phone?: string;
    email?: string;
    logoUrl?: string;
  };
  
  diNumber?: string;
  diDate?: Date | string;

  lineItems: IPurchaseInvoiceLineItem[];
  
  notes?: string;
  termsConditions?: string;

  subTotal: number;
  cgstPercentage?: number;
  sgstPercentage?: number;
  igstPercentage?: number;
  discountPercentage?: number;
  discountAmount?: number;
  taxAmount?: number;
  adjustment?: number;
  total: number;
  
  amountPaid: number;
  balanceDue: number;
  
  paymentTerms?: 'Paid' | 'Unpaid' | 'Lcterm' | 'Credit';
  status: 'Draft' | 'Sent' | 'Unpaid' | 'Overdue' | 'Partially Paid' | 'Paid' | 'Void' | 'Cancelled';
  receiptStatus: 'Pending Receipt' | 'Partially Received' | 'Received';
  billed?: boolean;
  billedStatus?: 'Billed' | 'Unbilled' | 'Partially Billed';
  
  attachments?: {
    name: string;
    url: string;
  }[];
  
  createdAt: Date;
  updatedAt: Date;
}

const purchaseInvoiceLineItemSchema = new Schema<IPurchaseInvoiceLineItem>({
  itemId: { type: Schema.Types.ObjectId, ref: 'Item', index: true },
  itemName: { type: String, required: true },
  description: { type: String },
  loaSerialNo: { type: String },
  hsnCode: { type: String },
  package: { type: String },
  circle: { type: String },
  subcircle: { type: String },
  tempCode: { type: String },
  diId: { type: Schema.Types.ObjectId, ref: 'DI' },
  diLineId: { type: Schema.Types.ObjectId },
  poQuantity: { type: Number },
  diQuantity: { type: Number, default: 0 },
  srt: { type: Number },
  act: { type: Number },
  totalInventory: { type: Number },
  unit: { type: String },
  cgst: { type: Number },
  sgst: { type: Number },
  igst: { type: Number },
  quantity: { type: Number, required: true, default: 1 },
  rate: { type: Number, required: true, default: 0 },
  amount: { type: Number, required: true, default: 0 },
  poDate: { type: Date },
  totalAmount: { type: Number, default: 0 },
  gstType: { type: String, enum: ['Intra State', 'Inter State'], default: 'Intra State' }
});

const purchaseInvoiceSchema = new Schema<IPurchaseInvoice>(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    vendorName: { type: String, required: true },
    purchaseOrderId: { type: Schema.Types.ObjectId, ref: 'PurchaseOrder' },
    purchaseOrderNumber: { type: String },
    date: { type: Date, required: true, default: Date.now },
    dueDate: { type: Date },
    
    billingCompany: {
      name: { type: String },
      address: { type: String },
      phone: { type: String },
      email: { type: String },
      logoUrl: { type: String },
    },
    
    diNumber: { type: String },
    diDate: { type: Date },

    lineItems: [purchaseInvoiceLineItemSchema],
    
    notes: { type: String },
    termsConditions: { type: String },
    
    subTotal: { type: Number, required: true, default: 0 },
    cgstPercentage: { type: Number, default: 0 },
    sgstPercentage: { type: Number, default: 0 },
    igstPercentage: { type: Number, default: 0 },
    discountPercentage: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    adjustment: { type: Number, default: 0 },
    total: { type: Number, required: true, default: 0 },
    
    amountPaid: { type: Number, default: 0 },
    balanceDue: { type: Number, default: 0 },
    
    paymentTerms: { 
      type: String, 
      enum: ['Paid', 'Unpaid', 'Lcterm', 'Credit']
    },
    status: { 
      type: String, 
      enum: ['Draft', 'Sent', 'Unpaid', 'Overdue', 'Partially Paid', 'Paid', 'Void', 'Cancelled'], 
      default: 'Draft',
      index: true
    },
    receiptStatus: {
      type: String,
      enum: ['Pending Receipt', 'Partially Received', 'Received'],
      default: 'Pending Receipt',
      index: true
    },
    billed: { type: Boolean, default: false },
    billedStatus: {
      type: String,
      enum: ['Billed', 'Unbilled', 'Partially Billed'],
      default: 'Unbilled'
    },
    
    attachments: [{
      name: { type: String },
      url: { type: String }
    }],
  },
  {
    timestamps: true,
  }
);

// Indexes for optimizing queries (sorting, pagination, filtering)
purchaseInvoiceSchema.index({ date: -1 });
purchaseInvoiceSchema.index({ vendorName: 1 });
purchaseInvoiceSchema.index({ purchaseOrderId: 1 });
purchaseInvoiceSchema.index({ status: 1 });
purchaseInvoiceSchema.index({ receiptStatus: 1 });
purchaseInvoiceSchema.index({ createdAt: -1 });

// Pre-save hook to calculate balance due and update status if needed
purchaseInvoiceSchema.pre('save', function() {
  if (this.isModified('total') || this.isModified('amountPaid')) {
    this.balanceDue = this.total - (this.amountPaid || 0);
    
    // Automatically manage Paid / Partially Paid statuses
    if (this.status !== 'Draft' && this.status !== 'Sent') {
      if (this.amountPaid > 0 && this.amountPaid < this.total) {
        this.status = 'Partially Paid';
      } else if (this.amountPaid >= this.total && this.total > 0) {
        this.status = 'Paid';
      } else if (this.amountPaid === 0 && (this.status === 'Partially Paid' || this.status === 'Paid')) {
        this.status = 'Unpaid';
      }
    }
  }
});

import { auditPlugin } from '../../core/plugins/audit.plugin';
purchaseInvoiceSchema.plugin(auditPlugin, { entityName: 'PurchaseInvoice', track: true });

export const PurchaseInvoice = mongoose.models.PurchaseInvoice || mongoose.model<IPurchaseInvoice>('PurchaseInvoice', purchaseInvoiceSchema);
