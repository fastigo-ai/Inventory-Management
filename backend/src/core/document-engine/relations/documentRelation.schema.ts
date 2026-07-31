import mongoose, { Schema, Document } from 'mongoose';

export interface IDocumentRelation extends Document {
  sourceDocument: mongoose.Types.ObjectId;
  sourceModule: string; // e.g. 'PurchaseOrder'
  targetDocument: mongoose.Types.ObjectId;
  targetModule: string; // e.g. 'DispatchInstruction'
  relationType: string; // e.g. 'CONSUMES', 'GENERATES', 'REFERENCES'
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const DocumentRelationSchema: Schema = new Schema({
  sourceDocument: { type: Schema.Types.ObjectId, required: true },
  sourceModule: { type: String, required: true },
  targetDocument: { type: Schema.Types.ObjectId, required: true },
  targetModule: { type: String, required: true },
  relationType: { type: String, required: true, default: 'CONSUMES' },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

// Index for fast graph traversal
DocumentRelationSchema.index({ sourceDocument: 1 });
DocumentRelationSchema.index({ targetDocument: 1 });

export const DocumentRelation = mongoose.models.DocumentRelation || mongoose.model<IDocumentRelation>('DocumentRelation', DocumentRelationSchema);
