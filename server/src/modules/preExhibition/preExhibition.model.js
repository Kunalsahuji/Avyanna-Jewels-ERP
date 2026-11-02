import mongoose from 'mongoose';

const preExhibitionChecklistItemSchema = new mongoose.Schema(
  {
    itemText: {
      type: String,
      required: true,
      trim: true,
    },
    isDone: {
      type: Boolean,
      default: false,
    },
    completedAt: {
      type: Date,
    },
    completedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { _id: true }
);

const preExhibitionSchema = new mongoose.Schema(
  {
    taskCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    exhibitionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exhibition',
    },
    exhibitionTitle: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: [
        'booth_design',
        'insurance_security',
        'vip_invites',
        'catalogue_marketing',
        'travel_logistics',
        'regulatory_carnet',
      ],
      required: true,
      default: 'booth_design',
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    milestoneDueDate: {
      type: Date,
      required: true,
    },
    priority: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low'],
      default: 'high',
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'review_required', 'completed'],
      default: 'pending',
      index: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    leadSignOff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    proofDocument: {
      type: String,
      trim: true,
    },
    remarks: {
      type: String,
      trim: true,
    },
    checklistItems: [preExhibitionChecklistItemSchema],
    auditTrail: [
      {
        action: String,
        performedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        performedByName: String,
        timestamp: {
          type: Date,
          default: Date.now,
        },
        notes: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

preExhibitionSchema.index({ status: 1, milestoneDueDate: 1 });

export const PreExhibitionTask = mongoose.model('PreExhibitionTask', preExhibitionSchema);
