import mongoose, { Schema, Document } from 'mongoose';

export interface IPrescription extends Document {
  userId: string;
  medicineName: string;
  dosage: string;
  frequency: string;
  timeSlot: string;
  reminderTime?: string;
  status: 'taken' | 'pending';
  date: Date;
}

const PrescriptionSchema: Schema = new Schema({
  userId: { type: String, required: true },
  medicineName: { type: String, required: true },
  dosage: { type: String, required: true },
  frequency: { type: String, required: true },
  timeSlot: { type: String, required: true },
  reminderTime: { type: String },
  status: { type: String, enum: ['taken', 'pending'], default: 'pending' },
  date: { type: Date, default: Date.now },
});

export default mongoose.model<IPrescription>('Prescription', PrescriptionSchema);
