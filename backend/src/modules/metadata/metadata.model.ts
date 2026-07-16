import mongoose, { Schema, Document } from 'mongoose';

export interface IField extends Document {
  name: string;
  label: string;
  type: string;
  required: boolean;
  visible: boolean;
  editable: boolean;
  defaultValue: any;
  validation?: any;
  tab?: string;
  order: number;
  options?: string[];
}

export interface IMetadata extends Document {
  entityName: string;
  fields: IField[];
}

const FieldSchema = new Schema({
  name: { type: String, required: true },
  label: { type: String, required: true },
  type: { type: String, required: true }, // 'text', 'number', 'boolean', 'dropdown', 'date'
  required: { type: Boolean, default: false },
  visible: { type: Boolean, default: true },
  editable: { type: Boolean, default: true },
  defaultValue: { type: Schema.Types.Mixed },
  validation: { type: Schema.Types.Mixed },
  tab: { type: String, default: 'General' },
  order: { type: Number, default: 0 },
  options: [{ type: String }]
}, { _id: false });

const MetadataSchema = new Schema({
  entityName: { type: String, required: true, unique: true },
  fields: [FieldSchema]
}, { timestamps: true });

export default mongoose.model<IMetadata>('Metadata', MetadataSchema);
