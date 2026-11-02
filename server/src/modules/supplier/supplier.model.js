import mongoose from 'mongoose';

const supplierOrderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    supplierName: {
      type: String,
      required: true,
      trim: true,
    },
    supplierContact: {
      type: String,
      trim: true,
    },
    gstin: {
      type: String,
      trim: true,
      uppercase: true,
    },
    itemType: {
      type: String,
      enum: [
        'bullion_gold',
        'bullion_silver',
        'loose_diamonds',
        'colored_gemstones',
        'findings_alloys',
      ],
      required: true,
      default: 'bullion_gold',
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    purity: {
      type: String,
      required: true,
      trim: true,
      default: '24K (999)',
    },
    quantityOrWeight: {
      type: Number,
      required: true,
      min: 0,
    },
    unit: {
      type: String,
      enum: ['grams', 'carats', 'pieces', 'kg'],
      default: 'grams',
    },
    ratePerUnit: {
      type: Number,
      required: true,
      min: 0,
    },
    subTotal: {
      type: Number,
      default: 0,
    },
    taxRate: {
      type: Number,
      default: 3, // 3% GST on Bullion & Gemstones in India
    },
    taxAmount: {
      type: Number,
      default: 0,
    },
    grandTotal: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: [
        'draft',
        'ordered',
        'in_transit',
        'received_testing',
        'approved',
        'rejected',
      ],
      default: 'ordered',
      index: true,
    },
    paymentTerms: {
      type: String,
      enum: ['immediate', 'advance_50', 'net_15', 'net_30'],
      default: 'immediate',
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'partially_paid', 'fully_paid'],
      default: 'unpaid',
    },
    invoiceNumber: {
      type: String,
      trim: true,
    },
    deliveryDate: {
      type: Date,
    },
    assayTestedPurity: {
      type: String,
      trim: true,
    },
    testedWeight: {
      type: Number,
      default: null,
    },
    assayFindings: {
      type: String,
      trim: true,
    },
    assignedInspector: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
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

supplierOrderSchema.index({ status: 1, itemType: 1 });
supplierOrderSchema.index({ createdAt: -1 });

export const SupplierOrder = mongoose.model('SupplierOrder', supplierOrderSchema);
