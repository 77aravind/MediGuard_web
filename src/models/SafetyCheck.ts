import mongoose, { Schema, Document } from 'mongoose';

export interface ISafetyCheck extends Document {
  userId: string;
  medicineName: string;
  safetyScore: number;
  status: 'Safe' | 'Warning' | 'Critical';
  description: string;
  warnings: string[];
  recommendations: string[];
  date: Date;
}

const SafetyCheckSchema: Schema = new Schema({
  userId: { type: String, required: true },
  medicineName: { type: String, required: true },
  safetyScore: { type: Number, required: true },
  status: { type: String, enum: ['Safe', 'Warning', 'Critical'], required: true },
  description: { type: String, required: true },
  warnings: [{ type: String }],
  recommendations: [{ type: String }],
  date: { type: Date, default: Date.now },
});

export default mongoose.model<ISafetyCheck>('SafetyCheck', SafetyCheckSchema);
