import mongoose, { Schema, Document } from 'mongoose';

export interface IDemandNoteItem {
  itemId?: mongoose.Types.ObjectId;
  itemName: string;
  itemDescription?: string;
  loaSrNo?: string;
  loaQty?: number;
  woQty?: number;
  bomQty?: number;
  alreadyIssuedQty?: number;
  transferFromOther?: number;
  transferToOther?: number;
  stockBal?: number;
  jmcQty?: number;
  wipQty?: number;
  wipRequiredQty?: number;
  miscellaneousQty?: number;
  demandQty: number;
  balBomQty?: number;
}

export interface IDemandNote extends Document {
  demandNoteNumber: string;
  createdBy: mongoose.Types.ObjectId;
  package: string;
  circle: string;
  contractorName?: string;
  division?: string;
  subDivision?: string;
  location?: string;
  status: 'Draft' | 'Pending Approval' | 'Approved' | 'Rejected' | 'Fulfilled';
  remarks?: string;
  locationDrawingUrl?: string;
  items: IDemandNoteItem[];
  createdAt: Date;
  updatedAt: Date;
}

const demandNoteItemSchema = new Schema<IDemandNoteItem>({
  itemId: { type: Schema.Types.ObjectId, ref: 'Item' },
  itemName: { type: String, required: true },
  itemDescription: { type: String },
  loaSrNo: { type: String },
  loaQty: { type: Number, default: 0 },
  woQty: { type: Number, default: 0 },
  bomQty: { type: Number, default: 0 },
  alreadyIssuedQty: { type: Number, default: 0 },
  transferFromOther: { type: Number, default: 0 },
  transferToOther: { type: Number, default: 0 },
  stockBal: { type: Number, default: 0 },
  jmcQty: { type: Number, default: 0 },
  wipQty: { type: Number, default: 0 },
  wipRequiredQty: { type: Number, default: 0 },
  miscellaneousQty: { type: Number, default: 0 },
  demandQty: { type: Number, required: true, default: 0 },
  balBomQty: { type: Number, default: 0 }
});

const demandNoteSchema = new Schema<IDemandNote>(
  {
    demandNoteNumber: { type: String, required: true, unique: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    package: { type: String, required: true },
    circle: { type: String, required: true },
    contractorName: { type: String },
    division: { type: String },
    subDivision: { type: String },
    location: { type: String },
    status: {
      type: String,
      enum: ['Draft', 'Pending Approval', 'Approved', 'Rejected', 'Fulfilled'],
      default: 'Draft'
    },
    remarks: { type: String },
    locationDrawingUrl: { type: String },
    items: [demandNoteItemSchema],
  },
  { timestamps: true }
);

import { auditPlugin } from '../../core/plugins/audit.plugin';
demandNoteSchema.plugin(auditPlugin, { entityName: 'DemandNote', track: true });

export default mongoose.model<IDemandNote>('DemandNote', demandNoteSchema);
