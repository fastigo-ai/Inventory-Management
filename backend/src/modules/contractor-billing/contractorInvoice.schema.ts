import mongoose, { Schema, Document } from 'mongoose';

export interface IContractorInvoiceItem {
  itemId: mongoose.Types.ObjectId;
  activity?: string;
  description?: string;
  billingCategory: 'Supply' | 'Erection';
  jmcDoneQty: number;
  erectedQty: number;
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
  
  // The type of billing stage based on flowchart
  stage: '10%' | '20%' | '25%' | '30%' | '50%' | '70%' | '75%' | '90%' | '100%';
  
  // References to the source documents that trigger the billing
  mhrovId?: mongoose.Types.ObjectId; // For Supply
  jmcId?: mongoose.Types.ObjectId;   // For Erection
  handoverCertificateId?: mongoose.Types.ObjectId; // For Final

  // For Stage 2 flexibility on Supply calculation
  supplyBasis?: 'MHROV Total' | 'JMC Erected';

  lineItems: IContractorInvoiceItem[];

  totalBaseAmount: number;
  totalGstAmount: number;
  grandTotal: number;

  jmcDocUrl?: string;
  signedBillDocUrl?: string;

  status: 'Draft' | 'Pending PM Approval' | 'Pending PD Approval' | 'Pending HO Approval' | 'Payment Processed' | 'Rejected';
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
  jmcDoneQty: { type: Number, required: true, default: 0 },
  erectedQty: { type: Number, required: true, default: 0 },
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
    enum: ['10%', '20%', '25%', '30%', '50%', '70%', '75%', '90%', '100%'],
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

  jmcDocUrl: { type: String },
  signedBillDocUrl: { type: String },

  status: {
    type: String,
    enum: ['Draft', 'Pending PM Approval', 'Pending PD Approval', 'Pending HO Approval', 'Payment Processed', 'Rejected'],
    default: 'Draft'
  },
  remarks: { type: String },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

export const ContractorInvoice = mongoose.model<IContractorInvoice>('ContractorInvoice', contractorInvoiceSchema);
