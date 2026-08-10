import mongoose, { Schema, Document } from 'mongoose';

export interface IHandoverCertificate extends Document {
  certificateNumber: string;
  date: Date;
  contractorId: mongoose.Types.ObjectId;
  workOrderId: mongoose.Types.ObjectId;
  locationDetails: {
    package?: string;
    circle?: string;
    division?: string;
    subDivision?: string;
  };
  remarks?: string;
  documentUrl?: string;
  status: 'Draft' | 'Issued' | 'Cancelled';
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const handoverCertificateSchema = new Schema<IHandoverCertificate>({
  certificateNumber: { type: String, required: true, unique: true },
  date: { type: Date, required: true, default: Date.now },
  contractorId: { type: Schema.Types.ObjectId, ref: 'Contractor', required: true },
  workOrderId: { type: Schema.Types.ObjectId, ref: 'ContractorWorkOrder', required: true },
  
  locationDetails: {
    package: { type: String },
    circle: { type: String },
    division: { type: String },
    subDivision: { type: String }
  },

  remarks: { type: String },
  documentUrl: { type: String },
  
  status: {
    type: String,
    enum: ['Draft', 'Issued', 'Cancelled'],
    default: 'Draft'
  },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

export const HandoverCertificate = mongoose.model<IHandoverCertificate>('HandoverCertificate', handoverCertificateSchema);
