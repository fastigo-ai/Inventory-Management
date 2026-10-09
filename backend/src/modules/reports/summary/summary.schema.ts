import mongoose, { Schema, Document } from 'mongoose';

export interface IItemSummary extends Document {
  itemId: mongoose.Types.ObjectId;
  itemName: string;
  circle?: string;
  package?: string;
  loaSerialNo?: string;
  tempCode?: string;
  companyId?: string;
  warehouseId?: string;
  
  loaQty: number;
  bomQty: number;
  diQty: number;
  invQty: number;
  actQty: number;
  srtQty: number;
  billedQty: number;
  poQty: number;
  mhrovQty: number;
  vendors?: string[];
  ra60Qty: number;
  ra30Qty: number;
  ra10Qty: number;
  er90Qty: number;
  er10Qty: number;
  jmcQty: number;
  cBillQty: number;
  
  transferInQty: number;
  transferOutQty: number;
  issuedQty: number;
  returnedQty: number;
  woQty: number;

  createdAt: Date;
  updatedAt: Date;
}

const itemSummarySchema = new Schema<IItemSummary>(
  {
    itemId: { type: Schema.Types.ObjectId, ref: 'Item', required: true },
    itemName: { type: String, required: true },
    circle: { type: String },
    package: { type: String },
    loaSerialNo: { type: String },
    tempCode: { type: String },
    companyId: { type: String },
    warehouseId: { type: String },
    
    loaQty: { type: Number, default: 0 },
    bomQty: { type: Number, default: 0 },
    diQty: { type: Number, default: 0 },
    invQty: { type: Number, default: 0 },
    actQty: { type: Number, default: 0 },
    srtQty: { type: Number, default: 0 },
    billedQty: { type: Number, default: 0 },
    poQty: { type: Number, default: 0 },
    mhrovQty: { type: Number, default: 0 },
    vendors: [{ type: String }],
    ra60Qty: { type: Number, default: 0 },
    ra30Qty: { type: Number, default: 0 },
    ra10Qty: { type: Number, default: 0 },
    er90Qty: { type: Number, default: 0 },
    er10Qty: { type: Number, default: 0 },
    jmcQty: { type: Number, default: 0 },
    cBillQty: { type: Number, default: 0 },
    
    transferInQty: { type: Number, default: 0 },
    transferOutQty: { type: Number, default: 0 },
    issuedQty: { type: Number, default: 0 },
    returnedQty: { type: Number, default: 0 },
    woQty: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Indexes for fast querying
itemSummarySchema.index({ circle: 1, package: 1, itemId: 1 });
itemSummarySchema.index({ companyId: 1, updatedAt: -1 });

export const ItemSummary = mongoose.model<IItemSummary>('ItemSummary', itemSummarySchema);
