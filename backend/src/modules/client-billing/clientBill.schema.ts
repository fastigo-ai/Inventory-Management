import mongoose, { Schema, Document } from 'mongoose';
import { auditPlugin } from '../../core/plugins/audit.plugin';

export interface IClientBillItem {
  loaSrNo: string;
  itemId?: mongoose.Types.ObjectId;
  tempCode?: string;
  itemName: string;
  diNo?: string;
  diDate?: Date;
  sourceDoneQty: number;
  raBillQty: number;
  boqRate: number;
  totalAmount: number;
}

export interface IClientBill extends Document {
  raBillNo: string;
  raBillDate: Date;
  billType: 'Supply' | 'Erection';
  stage: '60%' | '30%' | '10%' | '90%';
  referenceType: 'MHROV' | 'JMCRegister';
  referenceIds: mongoose.Types.ObjectId[];
  items: IClientBillItem[];
  status: 'Draft' | 'Pending PM Approval' | 'Pending PD Approval' | 'Approved' | 'Rejected';
  invoiceDocUrl?: string;
  diDocUrl?: string;
  mhrovDocUrl?: string;
  additionalDocsUrls?: { name: string, url: string }[];
  circle: string;
  package: string;
  createdBy: mongoose.Types.ObjectId;
  pmApprovedBy?: mongoose.Types.ObjectId;
  pmApprovedAt?: Date;
  pdApprovedBy?: mongoose.Types.ObjectId;
  pdApprovedAt?: Date;
  rejectedBy?: mongoose.Types.ObjectId;
  rejectedAt?: Date;
  rejectionRemarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

const clientBillItemSchema = new Schema<IClientBillItem>({
  loaSrNo: { type: String },
  itemId: { type: Schema.Types.ObjectId, ref: 'Item' },
  tempCode: { type: String },
  itemName: { type: String, required: true },
  diNo: { type: String },
  diDate: { type: Date },
  sourceDoneQty: { type: Number, required: true, default: 0 },
  raBillQty: { type: Number, required: true, default: 0 },
  boqRate: { type: Number, required: true, default: 0 },
  totalAmount: { type: Number, required: true, default: 0 }
});

const clientBillSchema = new Schema<IClientBill>(
  {
    raBillNo: { type: String, required: true },
    raBillDate: { type: Date, required: true },
    billType: { type: String, enum: ['Supply', 'Erection'], required: true },
    stage: { type: String, enum: ['60%', '30%', '10%', '90%'], required: true },
    referenceType: { type: String, enum: ['MHROV', 'JMCRegister'], required: true },
    referenceIds: [{ type: Schema.Types.ObjectId, required: true, refPath: 'referenceType' }],
    items: [clientBillItemSchema],
    status: {
      type: String,
      enum: ['Draft', 'Pending PM Approval', 'Pending PD Approval', 'Approved', 'Rejected'],
      default: 'Draft',
      index: true
    },
    invoiceDocUrl: { type: String },
    diDocUrl: { type: String },
    mhrovDocUrl: { type: String },
    additionalDocsUrls: [{ 
      name: { type: String },
      url: { type: String }
    }],
    circle: { type: String, required: true, index: true },
    package: { type: String, required: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    pmApprovedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    pmApprovedAt: { type: Date },
    pdApprovedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    pdApprovedAt: { type: Date },
    rejectedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    rejectedAt: { type: Date },
    rejectionRemarks: { type: String }
  },
  { timestamps: true }
);

// We need an index to ensure unique RA Bill Nos per circle/package (or globally depending on business logic)
clientBillSchema.index({ raBillNo: 1 }, { unique: true });

clientBillSchema.plugin(auditPlugin, { entityName: 'ClientBill', track: true });

export const ClientBill = mongoose.model<IClientBill>('ClientBill', clientBillSchema);
