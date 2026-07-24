import mongoose, { Schema, Document } from 'mongoose';

export interface IAssignmentLineItem {
  itemId?: mongoose.Types.ObjectId;
  itemName: string;
  tempCode?: string;
  unit?: string;
  hsnCode?: string;
  demandQty?: number;
  quantity: number;
  rate: number;
  discountPercentage?: number;
  amount: number;
}

export interface IContractorAssignment extends Document {
  contractorId: mongoose.Types.ObjectId;
  location: string;
  assignmentNumber: string; // Like Invoice# or MIN No.
  orderNumber?: string;
  date: Date;
  
  // MIN Specific Fields
  demandNo?: string;
  demandBookNo?: string;
  demandDate?: Date;
  contractorFarmName?: string;
  supervisorEngineer?: string;
  division?: string;
  subDivision?: string;
  subStation?: string;
  feeder?: string;
  vehicleNo?: string;
  minNo?: string;
  minBookNo?: string;
  minDate?: Date;
  issuedTfsSrNo?: string;
  remarks?: string;

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
  unit: { type: String, default: 'Nos' },
  hsnCode: { type: String },
  demandQty: { type: Number, default: 0 },
  quantity: { type: Number, required: true, default: 1 }, // Used as Issued Qty
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

    // MIN Specific Fields
    demandNo: { type: String },
    demandBookNo: { type: String },
    demandDate: { type: Date },
    contractorFarmName: { type: String },
    supervisorEngineer: { type: String },
    division: { type: String },
    subDivision: { type: String },
    subStation: { type: String },
    feeder: { type: String },
    vehicleNo: { type: String },
    minNo: { type: String },
    minBookNo: { type: String },
    minDate: { type: Date },
    issuedTfsSrNo: { type: String },
    remarks: { type: String },

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
