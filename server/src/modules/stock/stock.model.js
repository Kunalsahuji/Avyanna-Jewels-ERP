import mongoose from 'mongoose';

export const STOCK_STATUS = [
  'in_stock',
  'issued_to_karigar',
  'transfer_pending',
  'in_transit',
  'sold',
  'reserved',
];

export const ITEM_TYPES = [
  'ring',
  'necklace',
  'bangle',
  'earring',
  'bracelet',
  'pendant',
  'loose_diamonds',
  'gold_bullion',
  'other',
];

export const PURITY_OPTIONS = ['14K', '18K', '22K', '24K', '950 Platinum', '925 Silver'];

export const VAULT_LOCATIONS = [
  'Main Vault',
  'Showroom Safe',
  'Karigar Workshop',
  'In Transit',
  'Exhibition Stall',
  'Quality Check Lab',
];

const historySchema = new mongoose.Schema(
  {
    action: { type: String, required: true },
    fromLocation: { type: String },
    toLocation: { type: String },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    remarks: { type: String },
    weightAtAction: { type: Number },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const schema = new mongoose.Schema(
  {
    parcelId: { type: String, unique: true, index: true },
    barcode: { type: String, unique: true, index: true },
    itemType: { type: String, enum: ITEM_TYPES, required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    purity: { type: String, enum: PURITY_OPTIONS, default: '18K' },
    grossWeight: { type: Number, required: true }, // Gross weight in grams
    netWeight: { type: Number, required: true }, // Net gold weight in grams
    diamondCarat: { type: Number, default: 0 }, // Diamond carats (ct)
    stonePieces: { type: Number, default: 0 }, // Total diamond/stone count
    huid: { type: String, trim: true }, // BIS Hallmarking Unique Identification (6 alphanumeric)
    location: { type: String, enum: VAULT_LOCATIONS, default: 'Main Vault', index: true },
    status: { type: String, enum: STOCK_STATUS, default: 'in_stock', index: true },
    valuation: { type: Number, default: 0 }, // Approximate value in INR (₹)
    costPrice: { type: Number, default: 0 },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Karigar / Custodian
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    history: [historySchema],
  },
  { timestamps: true }
);

export const Stock = mongoose.model('Stock', schema);
