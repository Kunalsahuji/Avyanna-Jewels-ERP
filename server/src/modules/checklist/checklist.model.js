import mongoose from 'mongoose';

export const FREQUENCY = ['once', 'daily', 'weekly', 'monthly'];
export const CATEGORY = ['general', 'account'];

const schema = new mongoose.Schema(
  {
    taskCode: { type: String, unique: true, index: true },
    category: { type: String, enum: CATEGORY, default: 'general', index: true },
    description: { type: String, required: true, trim: true },
    frequency: { type: String, enum: FREQUENCY, default: 'once' },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    plannedDate: { type: Date, required: true, index: true },
    status: { type: String, enum: ['pending', 'completed'], default: 'pending', index: true },
    proofRequired: { type: Boolean, default: false },
    proofUrl: { type: String },
    documentName: { type: String },
    remark: { type: String },
    mdRemark: { type: String },
    actualDate: { type: Date },
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export const Checklist = mongoose.model('Checklist', schema);
