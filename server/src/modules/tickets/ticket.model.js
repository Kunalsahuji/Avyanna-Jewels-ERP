import mongoose from 'mongoose';

export const TICKET_STATUS = ['open', 'in_progress', 'review', 'closed'];
export const PRIORITY = ['low', 'medium', 'high', 'critical'];

const commentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const attachmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    url: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const schema = new mongoose.Schema(
  {
    ticketNo: { type: String, unique: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    department: { type: String, default: 'IT' },
    raisedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    priority: { type: String, enum: PRIORITY, default: 'medium' },
    status: { type: String, enum: TICKET_STATUS, default: 'open', index: true },
    dueDate: { type: Date, required: true, index: true },
    resolutionNotes: { type: String },
    remark: { type: String },
    comments: [commentSchema],
    attachments: [attachmentSchema],
    closedAt: { type: Date },
    closedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export const Ticket = mongoose.model('Ticket', schema);
