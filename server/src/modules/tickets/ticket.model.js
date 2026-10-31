import mongoose from 'mongoose';

export const TICKET_STATUS = ['open', 'in_progress', 'review', 'closed'];

const schema = new mongoose.Schema(
  {
    ticketNo: { type: String, unique: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    raisedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    status: { type: String, enum: TICKET_STATUS, default: 'open', index: true },
    dueDate: { type: Date, required: true, index: true },
    remark: String,
    closedAt: Date,
  },
  { timestamps: true }
);

export const Ticket = mongoose.model('Ticket', schema);
