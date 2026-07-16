import mongoose, { Schema, Document } from 'mongoose';

export interface IItem extends Document {
  dynamicData: Record<string, any>;
}

const ItemSchema = new Schema({
  // Instead of hardcoding sku, name, brand, etc., we store everything here.
  dynamicData: { type: Schema.Types.Mixed, required: true }
}, { timestamps: true });

export default mongoose.model<IItem>('Item', ItemSchema);
