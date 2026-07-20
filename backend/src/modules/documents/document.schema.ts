import mongoose, { Schema, Document } from 'mongoose';

export interface IDocument extends Document {
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  publicId: string; // Cloudinary public_id
  sourceType?: string; // e.g. 'Purchase Invoice'
  sourceId?: string; // ID of the source module
  uploadedBy?: mongoose.Types.ObjectId;
  status: 'Unreadable' | 'Pending' | 'Processed';
  uploadedOn: Date;
}

const documentSchema = new Schema<IDocument>(
  {
    fileName: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    sourceType: { type: String },
    sourceId: { type: String },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['Unreadable', 'Pending', 'Processed'], default: 'Pending' },
    uploadedOn: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

export const AppDocument = mongoose.model<IDocument>('Document', documentSchema);
