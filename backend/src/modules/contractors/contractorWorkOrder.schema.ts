import mongoose, { Schema, Document } from 'mongoose';

export interface IContractorWorkOrderItem {
  itemId: mongoose.Types.ObjectId;
  tempCode: string;
  activity: string;
  loaSrNo: string;
  description: string;
  unit: string;
  circleLoaQty: number;
  circleBomQty: number;
  alreadyIssuedQty: number;
  woQty: number;
  contractorErectionRate: number;
  amount: number;
  gstType: 'Inter' | 'Intra';
  gstAmount: number;
  totalAmount: number;
}

export interface IContractorWorkOrder extends Document {
  workOrderNumber: string;
  package: string;
  circle: string;
  contractorId: mongoose.Types.ObjectId;
  division: string;
  subDivision: string;
  location: string;
  remarks: string;
  activities: string[]; // Replaced single activity with array
  items: IContractorWorkOrderItem[];
  createdBy: mongoose.Types.ObjectId;
  status: 'Draft' | 'Approved' | 'Site Approved' | 'Completed';
  totalWoAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

const ContractorWorkOrderItemSchema = new Schema<IContractorWorkOrderItem>({
  itemId: { type: Schema.Types.ObjectId, ref: 'Item', required: true, index: true },
  tempCode: { type: String, default: '' },
  activity: { type: String, default: '' },
  loaSrNo: { type: String, default: '' },
  description: { type: String, default: '' },
  unit: { type: String, default: '' },
  circleLoaQty: { type: Number, default: 0 },
  circleBomQty: { type: Number, default: 0 },
  alreadyIssuedQty: { type: Number, default: 0 }, // Placeholder for ratio logic
  woQty: { type: Number, default: 0 },
  contractorErectionRate: { type: Number, default: 0 },
  amount: { type: Number, default: 0 },
  gstType: { type: String, enum: ['Inter', 'Intra'], default: 'Intra' },
  gstAmount: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
}, { _id: false });

const ContractorWorkOrderSchema = new Schema<IContractorWorkOrder>(
  {
    workOrderNumber: { type: String, required: true, unique: true },
    package: { type: String, required: true },
    circle: { type: String, required: true },
    contractorId: { type: Schema.Types.ObjectId, ref: 'Contractor', required: true, index: true },
    division: { type: String, default: '' },
    subDivision: { type: String, default: '' },
    location: { type: String, default: '' },
    remarks: { type: String, default: '' },
    activities: { type: [String], default: [] },
    items: [ContractorWorkOrderItemSchema],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: { type: String, enum: ['Draft', 'Approved', 'Site Approved', 'Completed'], default: 'Draft', index: true },
    totalWoAmount: { type: Number, default: 0 }
  },
  { timestamps: true }
);

ContractorWorkOrderSchema.index({ createdAt: -1 });

export const ContractorWorkOrder = mongoose.models.ContractorWorkOrder || mongoose.model<IContractorWorkOrder>('ContractorWorkOrder', ContractorWorkOrderSchema);
