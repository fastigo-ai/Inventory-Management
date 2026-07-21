import mongoose, { Schema, Document } from 'mongoose';

export interface IPurchaseInvoiceLineItem {
  itemId?: mongoose.Types.ObjectId;
  itemName: string;
  description?: string;
  hsnCode?: string;
  quantity: number;
  rate: number;
  amount: number;
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
  
  status: 'Draft' | 'Sent' | 'Unpaid' | 'Overdue' | 'Partially Paid' | 'Paid';
  receiptStatus: 'Pending Receipt' | 'Received';
  
  attachments?: {
    name: string;
    url: string;
  }[];
  
  createdAt: Date;
  updatedAt: Date;
}

const purchaseInvoiceLineItemSchema = new Schema<IPurchaseInvoiceLineItem>({
  itemId: { type: Schema.Types.ObjectId, ref: 'Item' },
  itemName: { type: String, required: true },
  description: { type: String },
  hsnCode: { type: String },
  quantity: { type: Number, required: true, default: 1 },
  rate: { type: Number, required: true, default: 0 },
  amount: { type: Number, required: true, default: 0 },
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
    
    status: { 
      type: String, 
      enum: ['Draft', 'Sent', 'Unpaid', 'Overdue', 'Partially Paid', 'Paid'], 
      default: 'Draft' 
    },
    receiptStatus: {
      type: String,
      enum: ['Pending Receipt', 'Received'],
      default: 'Pending Receipt'
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
