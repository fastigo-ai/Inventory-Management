import mongoose, { Schema, Document } from 'mongoose';

export interface IContractorInvoiceItem {
  itemId: mongoose.Types.ObjectId;
  activity?: string;
  description?: string;
  billingCategory: 'Supply' | 'Erection';
  quantity: number;
  rate: number;
  percentageApplied: number; // e.g., 60, 30, 90, 10
  baseAmount: number;
  gstRate: number;
  gstAmount: number;
  totalAmount: number;
}

export interface IContractorInvoice extends Document {
  invoiceNumber: string;
  date: Date;
  contractorId: mongoose.Types.ObjectId;
  workOrderId: mongoose.Types.ObjectId;
  
  // The type of billing stage
  stage: 'Stage 1 (Supply Initial)' | 'Stage 2 (Erection & Supply Balance)' | 'Stage 3 (Final/Retention)';
  
  // References to the source documents that trigger the billing
  mhrovId?: mongoose.Types.ObjectId; // For Stage 1
  jmcId?: mongoose.Types.ObjectId;   // For Stage 2
  handoverCertificateId?: mongoose.Types.ObjectId; // For Stage 3

  // For Stage 2 flexibility on Supply calculation (based on MHROV qty or JMC erected qty)
  supplyBasis?: 'MHROV Total' | 'JMC Erected';

  lineItems: IContractorInvoiceItem[];

  totalBaseAmount: number;
  totalGstAmount: number;
  grandTotal: number;

  status: 'Draft' | 'Submitted' | 'Approved' | 'Rejected' | 'Paid';
  remarks?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const contractorInvoiceItemSchema = new Schema<IContractorInvoiceItem>({
  itemId: { type: Schema.Types.ObjectId, ref: 'Item' },
  activity: { type: String },
  description: { type: String },
  billingCategory: { type: String, enum: ['Supply', 'Erection'], required: true },
  quantity: { type: Number, required: true },
  rate: { type: Number, required: true },
  percentageApplied: { type: Number, required: true },
  baseAmount: { type: Number, required: true },
  gstRate: { type: Number, required: true, default: 0 },
  gstAmount: { type: Number, required: true, default: 0 },
  totalAmount: { type: Number, required: true }
}, { _id: true });

const contractorInvoiceSchema = new Schema<IContractorInvoice>({
  invoiceNumber: { type: String, required: true, unique: true },
  date: { type: Date, required: true, default: Date.now },
  contractorId: { type: Schema.Types.ObjectId, ref: 'Contractor', required: true },
  workOrderId: { type: Schema.Types.ObjectId, ref: 'ContractorWorkOrder', required: true },
  
  stage: { 
    type: String, 
    enum: ['Stage 1 (Supply Initial)', 'Stage 2 (Erection & Supply Balance)', 'Stage 3 (Final/Retention)'],
    required: true
  },
  
  mhrovId: { type: Schema.Types.ObjectId, ref: 'Mhrov' },
  jmcId: { type: Schema.Types.ObjectId, ref: 'JmcRegister' },
  handoverCertificateId: { type: Schema.Types.ObjectId, ref: 'HandoverCertificate' },

  supplyBasis: {
    type: String,
    enum: ['MHROV Total', 'JMC Erected']
  },

  lineItems: [contractorInvoiceItemSchema],

  totalBaseAmount: { type: Number, required: true, default: 0 },
  totalGstAmount: { type: Number, required: true, default: 0 },
  grandTotal: { type: Number, required: true, default: 0 },

  status: {
    type: String,
    enum: ['Draft', 'Submitted', 'Approved', 'Rejected', 'Paid'],
    default: 'Draft'
  },
  remarks: { type: String },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

export const ContractorInvoice = mongoose.model<IContractorInvoice>('ContractorInvoice', contractorInvoiceSchema);
