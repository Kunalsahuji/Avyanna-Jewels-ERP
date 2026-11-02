import mongoose from 'mongoose';

const kpiItemSchema = new mongoose.Schema(
  {
    kpiName: {
      type: String,
      required: true,
      trim: true,
    },
    target: {
      type: Number,
      required: true,
    },
    actual: {
      type: Number,
      required: true,
    },
    weightPct: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    weightedScore: {
      type: Number,
      required: true,
    },
  },
  { _id: true }
);

const misScoreSchema = new mongoose.Schema(
  {
    period: {
      type: String,
      required: true, // e.g. '2026-10'
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    userName: {
      type: String,
      required: true,
      trim: true,
    },
    department: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    role: {
      type: String,
      trim: true,
    },
    kpis: [kpiItemSchema],
    compositeScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    grade: {
      type: String,
      enum: ['A+', 'A', 'B', 'C', 'D'],
      default: 'A',
    },
    performanceBand: {
      type: String,
      enum: [
        'exceptional',
        'exceeds_expectations',
        'meets_expectations',
        'needs_improvement',
        'critical_attention',
      ],
      default: 'meets_expectations',
    },
    appraisalNotes: {
      type: String,
      trim: true,
    },
    evaluatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    signOffStatus: {
      type: String,
      enum: ['draft', 'submitted', 'approved', 'contested'],
      default: 'approved',
    },
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

misScoreSchema.index({ period: 1, department: 1 });
misScoreSchema.index({ userId: 1, period: 1 }, { unique: true });

export const MisScore = mongoose.model('MisScore', misScoreSchema);
