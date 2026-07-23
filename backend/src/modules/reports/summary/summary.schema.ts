import mongoose, { Schema, Document } from 'mongoose';

export interface IItemSummary extends Document {
  itemId: mongoose.Types.ObjectId;
  itemName: string;
  circle?: string;
  package?: string;
  companyId?: string;
  warehouseId?: string;
  
  loaQty: number;
  bomQty: number;
  diQty: number;
  invQty: number;
  actQty: number;
  srtQty: number;
  billedQty: number;
  
  createdAt: Date;
  updatedAt: Date;
}

const itemSummarySchema = new Schema<IItemSummary>(
  {
    itemId: { type: Schema.Types.ObjectId, ref: 'Item', required: true },
    itemName: { type: String, required: true },
    circle: { type: String },
    package: { type: String },
    companyId: { type: String },
    warehouseId: { type: String },
    
    loaQty: { type: Number, default: 0 },
    bomQty: { type: Number, default: 0 },
    diQty: { type: Number, default: 0 },
    invQty: { type: Number, default: 0 },
    actQty: { type: Number, default: 0 },
    srtQty: { type: Number, default: 0 },
    billedQty: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Indexes for fast querying
itemSummarySchema.index({ circle: 1, package: 1, itemId: 1 });
itemSummarySchema.index({ companyId: 1, updatedAt: -1 });

export const ItemSummary = mongoose.model<IItemSummary>('ItemSummary', itemSummarySchema);
