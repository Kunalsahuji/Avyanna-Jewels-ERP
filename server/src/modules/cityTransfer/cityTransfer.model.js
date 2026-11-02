import mongoose from 'mongoose';

export const TRANSFER_STATUS = [
  'requested',
  'approved',
  'in_transit',
  'received',
  'rejected',
];

export const BRANCH_LOCATIONS = [
  'Mumbai Main Vault',
  'Surat Manufacturing Unit',
  'Delhi Flagship Showroom',
  'Jaipur Exhibition Depot',
  'Bangalore Boutique Vault',
  'Hyderabad Showcase Safe',
];

export const CARRIER_TYPES = [
  'Secured Armored Carrier',
  'Brinks / BVC Logistics',
  'Personal Hand Carry (Staff Escort)',
  'Internal Security Courier',
];

const parcelItemSchema = new mongoose.Schema(
  {
    parcelId: { type: String, required: true },
    title: { type: String, required: true },
    grossWeight: { type: Number, required: true },
    netWeight: { type: Number, required: true },
    diamondCarat: { type: Number, default: 0 },
    valuation: { type: Number, default: 0 },
    purity: { type: String, default: '18K' },
  },
  { _id: false }
);

const timelineEventSchema = new mongoose.Schema(
  {
    action: { type: String, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    gatePassNo: { type: String },
    remarks: { type: String },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const schema = new mongoose.Schema(
  {
    transferNo: { type: String, unique: true, index: true },
    gatePassNo: { type: String, index: true }, // Generated on approval e.g. GP-2026-0001
    fromLocation: { type: String, enum: BRANCH_LOCATIONS, required: true, index: true },
    toLocation: { type: String, enum: BRANCH_LOCATIONS, required: true, index: true },
    status: { type: String, enum: TRANSFER_STATUS, default: 'requested', index: true },

    parcels: [parcelItemSchema],
    totalGrossWeight: { type: Number, required: true }, // in grams
    totalNetWeight: { type: Number, required: true }, // in grams
    totalDiamondCarat: { type: Number, default: 0 }, // in carats
    totalValuation: { type: Number, required: true }, // in INR (₹)

    carrierType: { type: String, enum: CARRIER_TYPES, default: 'Secured Armored Carrier' },
    carrierPersonName: { type: String, trim: true },
    carrierContact: { type: String, trim: true },
    waybillNo: { type: String, trim: true }, // Tracking / Air waybill number
    vehicleNo: { type: String, trim: true },

    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    dispatchedAt: { type: Date },
    receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    receivedAt: { type: Date },

    weighedReturnGrossWeight: { type: Number },
    weightVariance: { type: Number, default: 0 }, // Variance in grams (departure vs arrival)
    notes: { type: String, trim: true },
    timeline: [timelineEventSchema],
  },
  { timestamps: true }
);

export const CityTransfer = mongoose.model('CityTransfer', schema);
