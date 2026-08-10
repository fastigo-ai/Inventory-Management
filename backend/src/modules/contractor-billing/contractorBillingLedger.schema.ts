import mongoose, { Schema, Document } from 'mongoose';

export interface ILedgerItem {
  itemId: mongoose.Types.ObjectId;
  activity?: string;
  totalReceivedQty: number;  // Cumulative qty from MHROV
  totalErectedQty: number;   // Cumulative qty from JMC
  supplyBilledPercentage: number; // 0, 60, 90, 100
  erectionBilledPercentage: number; // 0, 90, 100
  lastBilledAt?: Date;
}

export interface IContractorBillingLedger extends Document {
  workOrderId: mongoose.Types.ObjectId;
  contractorId: mongoose.Types.ObjectId;
  items: ILedgerItem[];
  updatedAt: Date;
}

const ledgerItemSchema = new Schema<ILedgerItem>({
  itemId: { type: Schema.Types.ObjectId, ref: 'Item' },
  activity: { type: String },
  totalReceivedQty: { type: Number, default: 0 },
  totalErectedQty: { type: Number, default: 0 },
  supplyBilledPercentage: { type: Number, default: 0 },
  erectionBilledPercentage: { type: Number, default: 0 },
  lastBilledAt: { type: Date }
}, { _id: false });

const contractorBillingLedgerSchema = new Schema<IContractorBillingLedger>({
  workOrderId: { type: Schema.Types.ObjectId, ref: 'ContractorWorkOrder', required: true, unique: true },
  contractorId: { type: Schema.Types.ObjectId, ref: 'Contractor', required: true },
  items: [ledgerItemSchema]
}, { timestamps: true });

export const ContractorBillingLedger = mongoose.model<IContractorBillingLedger>('ContractorBillingLedger', contractorBillingLedgerSchema);
