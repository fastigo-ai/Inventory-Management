import mongoose, { Schema, Document } from 'mongoose';

export interface IHistoryLog {
  action: string;
  performedBy: string;
  details?: string;
  timestamp: Date;
}

export interface IItem extends Document {
  dynamicData: Record<string, any>;
  isDeleted: boolean;
  history: IHistoryLog[];
}

const HistorySchema = new Schema({
  action: { type: String, required: true },
  performedBy: { type: String, required: true },
  details: { type: String },
  timestamp: { type: Date, default: Date.now }
}, { _id: false });

const ItemSchema = new Schema({
  // Instead of hardcoding sku, name, brand, etc., we store everything here.
  dynamicData: { type: Schema.Types.Mixed, required: true },
  isDeleted: { type: Boolean, default: false },
  history: [HistorySchema] // We'll phase this out
}, { timestamps: true, strictQuery: false });

import { auditPlugin } from '../../core/plugins/audit.plugin';
ItemSchema.plugin(auditPlugin, { entityName: 'Item', track: true });

export default mongoose.models.Item || mongoose.model<IItem>('Item', ItemSchema);
