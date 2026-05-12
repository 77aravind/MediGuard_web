import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  conditions: string[];
  allergies: string[];
  bloodType?: string;
  height?: string;
  weight?: string;
  gender?: string;
  age?: number;
  phone?: string;
  nextVisit?: string;
  notificationsEnabled?: boolean;
  createdAt: Date;
}

const UserSchema: Schema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  conditions: [{ type: String }],
  allergies: [{ type: String }],
  bloodType: { type: String },
  height: { type: String },
  weight: { type: String },
  gender: { type: String },
  age: { type: Number },
  phone: { type: String },
  nextVisit: { type: String },
  notificationsEnabled: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<IUser>('User', UserSchema);
