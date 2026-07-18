import mongoose, { Schema, Document } from 'mongoose';

export interface IDILineItem {
  itemId?: mongoose.Types.ObjectId;
  itemName: string;
  tempCode?: string;
  package?: string;
  circle?: string;
  quantity: number;
}

export interface IDI extends Document {
  diNumber: string;
  purchaseOrderId: mongoose.Types.ObjectId;
  date: Date;
  circle?: string;
  package?: string;
  lineItems: IDILineItem[];
  status: 'Pending Receipt' | 'Received' | 'Cancelled';
  notes?: string;
  attachments?: {
    name: string;
    url: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const diLineItemSchema = new Schema<IDILineItem>({
  itemId: { type: Schema.Types.ObjectId, ref: 'Item' },
  itemName: { type: String, required: true },
  tempCode: { type: String },
  package: { type: String },
  circle: { type: String },
  quantity: { type: Number, required: true, default: 0 },
});

const diSchema = new Schema<IDI>(
  {
    diNumber: { type: String, required: true, unique: true },
    purchaseOrderId: { type: Schema.Types.ObjectId, ref: 'PurchaseOrder', required: true },
    date: { type: Date, required: true, default: Date.now },
    circle: { type: String },
    package: { type: String },
    lineItems: [diLineItemSchema],
    status: { type: String, enum: ['Pending Receipt', 'Received', 'Cancelled'], default: 'Pending Receipt' },
    notes: { type: String },
    attachments: [{
      name: { type: String },
      url: { type: String }
    }],
  },
  { timestamps: true }
);

export const DI = mongoose.models.DI || mongoose.model<IDI>('DI', diSchema);
