import mongoose, { Schema, Document } from 'mongoose';

export interface IJmcItem {
  itemId?: mongoose.Types.ObjectId;
  loaSerialNo?: string;
  activity: string;
  description: string;
  unit: string;
  prevQty: number;
  claimedQty: number;
  approvedQty: number;
  rate: number;
  amount: number;
  remarks: string;
}

export interface IJmcRegister extends Document {
  jmcNumber: string;
  date: Date;
  contractorId: mongoose.Types.ObjectId;
  workOrderId?: mongoose.Types.ObjectId;
  package: string;
  location: string;
  circle: string;
  division: string;
  subDivision: string;
  items: IJmcItem[];
  claimedAmount: number;
  approvedAmount: number;
  status: 'Draft' | 'Submitted' | 'Approved' | 'Rejected';
  remarks: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const JmcItemSchema = new Schema<IJmcItem>({
  itemId: { type: Schema.Types.ObjectId, ref: 'Item' },
  loaSerialNo: { type: String, default: '' },
  activity: { type: String, default: '' },
  description: { type: String, default: '' },
  unit: { type: String, default: '' },
  prevQty: { type: Number, default: 0 },
  claimedQty: { type: Number, default: 0 },
  approvedQty: { type: Number, default: 0 },
  rate: { type: Number, default: 0 },
  amount: { type: Number, default: 0 },
  remarks: { type: String, default: '' }
}, { _id: false });

const JmcRegisterSchema = new Schema<IJmcRegister>(
  {
    jmcNumber: { type: String, required: true, unique: true },
    date: { type: Date, default: Date.now },
    contractorId: { type: Schema.Types.ObjectId, ref: 'Contractor', required: true, index: true },
    workOrderId: { type: Schema.Types.ObjectId, ref: 'ContractorWorkOrder' },
    package: { type: String, default: '' },
    location: { type: String, default: '' },
    circle: { type: String, default: '' },
    division: { type: String, default: '' },
    subDivision: { type: String, default: '' },
    items: [JmcItemSchema],
    claimedAmount: { type: Number, default: 0 },
    approvedAmount: { type: Number, default: 0 },
    status: { type: String, enum: ['Draft', 'Submitted', 'Approved', 'Rejected'], default: 'Draft', index: true },
    remarks: { type: String, default: '' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true }
);

JmcRegisterSchema.index({ createdAt: -1 });

export const JmcRegister = mongoose.models.JmcRegister || mongoose.model<IJmcRegister>('JmcRegister', JmcRegisterSchema);
