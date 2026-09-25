import mongoose, { Schema, Document } from 'mongoose';

export interface IDivision extends Document {
  name: string;
  package?: string;
  circle?: string;
  subcircle?: string;
  createdAt: Date;
  updatedAt: Date;
}

const divisionSchema = new Schema<IDivision>(
  {
    name: { type: String, required: true },
    package: { type: String, default: '' },
    circle: { type: String, default: '' },
    subcircle: { type: String, default: '' },
  },
  { timestamps: true }
);

divisionSchema.index({ name: 1, package: 1, circle: 1, subcircle: 1 }, { unique: true });

export default mongoose.models.Division || mongoose.model<IDivision>('Division', divisionSchema);
