import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema(
  {
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
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    shift: {
      type: String,
      enum: [
        'general_day',
        'karigar_morning',
        'karigar_evening',
        'sales_showroom',
        'vault_security',
      ],
      default: 'general_day',
    },
    punchIn: {
      type: Date,
      default: null,
    },
    punchOut: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['present', 'late', 'half_day', 'on_leave', 'absent'],
      default: 'present',
      index: true,
    },
    lateMinutes: {
      type: Number,
      default: 0,
    },
    workHours: {
      type: Number,
      default: 0,
    },
    overtimeHours: {
      type: Number,
      default: 0,
    },
    biometricDeviceId: {
      type: String,
      default: 'BIO-GATE-MAIN-01',
    },
    vaultClearanceCheck: {
      type: Boolean,
      default: true, // Body metal detector scan upon exit
    },
    remarks: {
      type: String,
      trim: true,
    },
    regularizedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    regularizationReason: {
      type: String,
      trim: true,
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

attendanceSchema.index({ date: -1, department: 1 });
attendanceSchema.index({ userId: 1, date: 1 }, { unique: true });

export const Attendance = mongoose.model('Attendance', attendanceSchema);
