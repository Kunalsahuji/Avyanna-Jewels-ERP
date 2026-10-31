import mongoose from 'mongoose';

export const DELEGATION_STATUS = ['pending', 'approval_waiting', 'completed', 'shifted'];
export const PRIORITY = ['low', 'medium', 'high', 'critical'];

const remarkSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const shiftSchema = new mongoose.Schema(
  {
    previousDate: { type: Date, required: true },
    newDate: { type: Date, required: true },
    reason: { type: String, required: true },
    shiftedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const fileSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    url: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const schema = new mongoose.Schema(
  {
    taskId: { type: String, unique: true, index: true },
    description: { type: String, required: true, trim: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    dueDate: { type: Date, required: true, index: true },
    originalDueDate: { type: Date },
    priority: { type: String, enum: PRIORITY, default: 'medium' },
    status: { type: String, enum: DELEGATION_STATUS, default: 'pending', index: true },
    revisions: { type: Number, default: 0 },
    remark: { type: String },
    remarks: [remarkSchema],
    shiftHistory: [shiftSchema],
    files: [fileSchema],
    completedAt: { type: Date },
  },
  { timestamps: true }
);

export const Delegation = mongoose.model('Delegation', schema);
