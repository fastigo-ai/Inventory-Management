import mongoose, { Schema, Document } from 'mongoose';

export interface IClientLedgerItem {
  itemId: mongoose.Types.ObjectId;
  loaSrNo: string;
  tempCode: string;
  
  // Stage tracking (Cumulative Quantities Billed)
  supplyQty60: number;
  supplyQty30: number;
  supplyQty10: number;
  
  erectionQty90: number;
  erectionQty10: number;
  
  lastBilledAt: Date;
}

export interface IClientBillingLedger extends Document {
  circle: string;
  package: string;
  items: IClientLedgerItem[];
  updatedAt: Date;
  createdAt: Date;
}

const clientLedgerItemSchema = new Schema<IClientLedgerItem>({
  itemId: { type: Schema.Types.ObjectId, ref: 'Item', required: true },
  loaSrNo: { type: String, default: '' },
  tempCode: { type: String, default: '' },
  
  supplyQty60: { type: Number, default: 0 },
  supplyQty30: { type: Number, default: 0 },
  supplyQty10: { type: Number, default: 0 },
  
  erectionQty90: { type: Number, default: 0 },
  erectionQty10: { type: Number, default: 0 },
  
  lastBilledAt: { type: Date }
}, { _id: false });

const clientBillingLedgerSchema = new Schema<IClientBillingLedger>({
  circle: { type: String, required: true },
  package: { type: String, required: true },
  items: [clientLedgerItemSchema]
}, { timestamps: true });

// Ensure unique ledger per circle/package combination
clientBillingLedgerSchema.index({ circle: 1, package: 1 }, { unique: true });

export const ClientBillingLedger = mongoose.model<IClientBillingLedger>('ClientBillingLedger', clientBillingLedgerSchema);
