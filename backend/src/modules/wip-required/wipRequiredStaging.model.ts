import mongoose, { Schema, Document } from 'mongoose';

export interface IWipRequiredStaging extends Document {
  uploadSessionId: string;
  status: 'PENDING' | 'VALID' | 'ERROR';
  issue?: string;
  rawData: any; // Raw JSON from Excel row for export
  
  // Below are fields mirroring WipRequiredRegister
  item?: mongoose.Types.ObjectId; // Referencing Master Item List
  description: string; // The raw description from excel
  uom?: string;
  loaSrNo: string;
  tempCode?: string;
  schedule: string;
  activity: string;
  circle: string;
  division?: string;
  subDivision?: string;
  subStation?: string;
  feeder?: string;
  location?: string;
  drawingNo?: string;
  
  contractorName?: string;
  siteRequiredQty: number; // Value in cell
  
  sourceFile: string;
  sheetName: string;
  remarks?: string;
  uploadedBy: mongoose.Types.ObjectId;
}

const wipRequiredStagingSchema = new Schema<IWipRequiredStaging>(
  {
    uploadSessionId: { type: String, required: true, index: true },
    status: { type: String, enum: ['PENDING', 'VALID', 'ERROR'], default: 'PENDING', index: true },
    issue: { type: String },
    rawData: { type: Schema.Types.Mixed },
    
    item: { type: Schema.Types.ObjectId, ref: 'Item' },
    description: { type: String },
    uom: { type: String },
    loaSrNo: { type: String, required: true },
    tempCode: { type: String },
    schedule: { type: String },
    activity: { type: String },
    circle: { type: String, required: true },
    division: { type: String },
    subDivision: { type: String },
    subStation: { type: String },
    feeder: { type: String },
    location: { type: String },
    drawingNo: { type: String },
    
    contractorName: { type: String },
    siteRequiredQty: { type: Number, required: true },
    
    sourceFile: { type: String },
    sheetName: { type: String },
    remarks: { type: String },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true }
);

// Expire staging records after 2 hours automatically
wipRequiredStagingSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7200 });

export default mongoose.models.WipRequiredStaging || mongoose.model<IWipRequiredStaging>('WipRequiredStaging', wipRequiredStagingSchema);
