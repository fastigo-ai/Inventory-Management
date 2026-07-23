import mongoose, { Schema, Document } from 'mongoose';

export interface IReturnLineItem {
  itemId?: mongoose.Types.ObjectId;
  itemName: string;
  tempCode?: string;
  unit?: string;
  hsnCode?: string;
  quantity: number; // Return Qty
}

export interface IContractorReturn extends Document {
  contractorId: mongoose.Types.ObjectId;
  location?: string;
  
  // Return Specific Fields
  returnChallanNo: string;
  bookNo?: string;
  returnChallanDate: Date;
  contractorFarmName?: string;
  supervisorEngineer?: string;
  division?: string;
  subDivision?: string;
  subStation?: string;
  feeder?: string;
  remarks?: string;
  issuedTfsSrNo?: string;

  lineItems: IReturnLineItem[];
  status: 'Draft' | 'Submitted' | 'Cancelled';
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const returnLineItemSchema = new Schema<IReturnLineItem>({
  itemId: { type: Schema.Types.ObjectId, ref: 'Item' },
  itemName: { type: String, required: true },
  tempCode: { type: String },
  unit: { type: String, default: 'Nos' },
  hsnCode: { type: String },
  quantity: { type: Number, required: true, default: 1 }, // Return Qty
});

const contractorReturnSchema = new Schema<IContractorReturn>(
  {
    contractorId: { type: Schema.Types.ObjectId, ref: 'Contractor', required: true },
    location: { type: String },
    
    // Return Specific Fields
    returnChallanNo: { type: String, required: true, unique: true },
    bookNo: { type: String },
    returnChallanDate: { type: Date, required: true, default: Date.now },
    contractorFarmName: { type: String },
    supervisorEngineer: { type: String },
    division: { type: String },
    subDivision: { type: String },
    subStation: { type: String },
    feeder: { type: String },
    remarks: { type: String },
    issuedTfsSrNo: { type: String },

    lineItems: [returnLineItemSchema],
    status: { type: String, enum: ['Draft', 'Submitted', 'Cancelled'], default: 'Submitted' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

export const ContractorReturn = mongoose.models.ContractorReturn || mongoose.model<IContractorReturn>('ContractorReturn', contractorReturnSchema);
