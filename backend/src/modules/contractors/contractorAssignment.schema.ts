import mongoose, { Schema, Document } from 'mongoose';

export interface IAssignmentLineItem {
  itemId?: mongoose.Types.ObjectId;
  itemName: string;
  tempCode?: string;
  quantity: number;
  rate: number;
  discountPercentage?: number;
  amount: number;
}

export interface IContractorAssignment extends Document {
  contractorId: mongoose.Types.ObjectId;
  location: string;
  assignmentNumber: string; // Like Invoice#
  orderNumber?: string;
  date: Date;
  terms?: string;
  dueDate?: Date;
  subject?: string;
  warehouseLocation?: string;
  lineItems: IAssignmentLineItem[];
  subTotal: number;
  shippingCharges?: number;
  taxType?: 'TDS' | 'TCS';
  taxAmount?: number;
  adjustment?: number;
  total: number;
  customerNotes?: string;
  termsConditions?: string;
  status: 'Draft' | 'Sent' | 'Cancelled';
  createdAt: Date;
  updatedAt: Date;
}

const assignmentLineItemSchema = new Schema<IAssignmentLineItem>({
  itemId: { type: Schema.Types.ObjectId, ref: 'Item' },
  itemName: { type: String, required: true },
  tempCode: { type: String },
  quantity: { type: Number, required: true, default: 1 },
  rate: { type: Number, required: true, default: 0 },
  discountPercentage: { type: Number, default: 0 },
  amount: { type: Number, required: true, default: 0 },
});

const contractorAssignmentSchema = new Schema<IContractorAssignment>(
  {
    contractorId: { type: Schema.Types.ObjectId, ref: 'Contractor', required: true },
    location: { type: String },
    assignmentNumber: { type: String, required: true, unique: true },
    orderNumber: { type: String },
    date: { type: Date, required: true, default: Date.now },
    terms: { type: String },
    dueDate: { type: Date },
    subject: { type: String },
    warehouseLocation: { type: String },
    lineItems: [assignmentLineItemSchema],
    subTotal: { type: Number, required: true, default: 0 },
    shippingCharges: { type: Number, default: 0 },
    taxType: { type: String, enum: ['TDS', 'TCS'] },
    taxAmount: { type: Number, default: 0 },
    adjustment: { type: Number, default: 0 },
    total: { type: Number, required: true, default: 0 },
    customerNotes: { type: String },
    termsConditions: { type: String },
    status: { type: String, enum: ['Draft', 'Sent', 'Cancelled'], default: 'Draft' },
  },
  { timestamps: true }
);

export const ContractorAssignment = mongoose.models.ContractorAssignment || mongoose.model<IContractorAssignment>('ContractorAssignment', contractorAssignmentSchema);
