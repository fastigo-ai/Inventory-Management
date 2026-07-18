import mongoose, { Schema, Document } from 'mongoose';
import { IRole } from '../roles/role.model';

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  role: IRole['_id'] | IRole; // Can be ObjectId or populated Role
  refreshTokens?: string[];
  sessionVersion: number;
}

const UserSchema: Schema = new Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: Schema.Types.ObjectId, ref: 'Role', required: true },
    refreshTokens: [{ type: String }],
    sessionVersion: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Exclude password field from the default JSON output
UserSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.password;
    delete ret.refreshTokens;
    return ret;
  },
});

export default mongoose.model<IUser>('User', UserSchema);
