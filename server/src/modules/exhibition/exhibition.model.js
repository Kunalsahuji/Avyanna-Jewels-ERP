import mongoose from 'mongoose';

const exhibitionItemSchema = new mongoose.Schema(
  {
    parcelNumber: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ['ring', 'necklace', 'bangle', 'earring', 'bracelet', 'pendant', 'bridal_set'],
      default: 'necklace',
    },
    purity: {
      type: String,
      default: '18K (750)',
    },
    grossWeight: {
      type: Number,
      required: true,
      min: 0,
    },
    diamondWeight: {
      type: Number,
      default: 0,
    },
    tagPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['allocated', 'on_display', 'sold', 'returned_to_vault'],
      default: 'on_display',
    },
    soldToCustomer: {
      type: String,
      trim: true,
    },
    soldAmount: {
      type: Number,
      default: null,
    },
    invoiceNumber: {
      type: String,
      trim: true,
    },
    soldAt: {
      type: Date,
    },
  },
  { _id: true }
);

const exhibitionSchema = new mongoose.Schema(
  {
    eventCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    venue: {
      type: String,
      required: true,
      trim: true,
    },
    boothNumber: {
      type: String,
      required: true,
      trim: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: [
        'planning',
        'stock_allocated',
        'in_transit',
        'live_exhibition',
        'reconciliation',
        'closed',
      ],
      default: 'planning',
      index: true,
    },
    salesTarget: {
      type: Number,
      default: 0,
    },
    totalSalesAchieved: {
      type: Number,
      default: 0,
    },
    totalPiecesSold: {
      type: Number,
      default: 0,
    },
    allocatedStockValue: {
      type: Number,
      default: 0,
    },
    allocatedPieces: {
      type: Number,
      default: 0,
    },
    allocatedWeight: {
      type: Number,
      default: 0,
    },
    allocatedDiamondsCarats: {
      type: Number,
      default: 0,
    },
    transitInsurancePolicy: {
      type: String,
      trim: true,
    },
    securityCarrier: {
      type: String,
      trim: true,
      default: 'BVC Logistics Armored Transit',
    },
    leadManager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    boothStaff: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    allocatedItems: [exhibitionItemSchema],
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

exhibitionSchema.index({ status: 1, city: 1 });
exhibitionSchema.index({ startDate: -1 });

export const Exhibition = mongoose.model('Exhibition', exhibitionSchema);
