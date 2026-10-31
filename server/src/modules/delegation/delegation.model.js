import mongoose from 'mongoose';

export const DELEGATION_STATUS = ['pending', 'approval_waiting', 'completed', 'shifted'];
export const PRIORITY = ['low', 'medium', 'high', 'critical'];

const schema = new mongoose.Schema(
  {
    taskId: { type: String, unique: true, index: true },
    description: { type: String, required: true, trim: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    dueDate: { type: Date, required: true, index: true },
    priority: { type: String, enum: PRIORITY, default: 'medium' },
    status: { type: String, enum: DELEGATION_STATUS, default: 'pending', index: true },
    revisions: { type: Number, default: 0 },
    remark: String,
    completedAt: Date,
  },
  { timestamps: true }
);

export const Delegation = mongoose.model('Delegation', schema);
