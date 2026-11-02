import mongoose from 'mongoose';

export const PRODUCTION_STAGES = [
  'cad_design',
  'casting',
  'filing_grinding',
  'diamond_setting',
  'polishing_rhodium',
  'quality_qc',
  'completed',
];

export const STAGE_LABELS = {
  cad_design: 'CAD & 3D Wax',
  casting: 'Tree Casting',
  filing_grinding: 'Filing & Assembly',
  diamond_setting: 'Diamond Setting',
  polishing_rhodium: 'Polishing & Rhodium',
  quality_qc: 'QC & Hallmarking',
  completed: 'Finished / Ready for Vault',
};

export const JOB_PRIORITY = ['low', 'medium', 'high', 'rush_urgent'];

export const JEWELRY_CATEGORIES = [
  'ring',
  'necklace',
  'bangle',
  'earring',
  'bracelet',
  'pendant',
  'bespoke',
  'other',
];

export const PURITY_OPTIONS = ['14K', '18K', '22K', '24K', '950 Platinum'];

const stageHistorySchema = new mongoose.Schema(
  {
    stage: { type: String, enum: PRODUCTION_STAGES, required: true },
    karigar: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
    issuedWeight: { type: Number },
    returnedWeight: { type: Number },
    metalLoss: { type: Number, default: 0 },
    lossPct: { type: Number, default: 0 },
    brokenStones: { type: Number, default: 0 },
    notes: { type: String },
    passedQc: { type: Boolean },
    huidCode: { type: String },
  },
  { _id: false }
);

const schema = new mongoose.Schema(
  {
    jobNo: { type: String, unique: true, index: true },
    designCode: { type: String, required: true, trim: true, index: true }, // e.g. TJ-RNG-2026-08
    title: { type: String, required: true, trim: true },
    clientOrderNo: { type: String, trim: true },
    category: { type: String, enum: JEWELRY_CATEGORIES, default: 'ring' },
    purity: { type: String, enum: PURITY_OPTIONS, default: '18K' },

    currentStage: { type: String, enum: PRODUCTION_STAGES, default: 'cad_design', index: true },
    stageIndex: { type: Number, default: 0 }, // 0 to 6
    priority: { type: String, enum: JOB_PRIORITY, default: 'medium', index: true },
    status: { type: String, enum: ['pending', 'in_progress', 'completed', 'on_hold'], default: 'in_progress', index: true },

    assignedKarigar: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    dueDate: { type: Date, required: true },
    completedAt: { type: Date },

    // Metal tracking across entire job
    initialGoldWeight: { type: Number, required: true }, // in grams
    currentGoldWeight: { type: Number, required: true }, // in grams
    totalGoldLoss: { type: Number, default: 0 }, // cumulative loss in grams

    // Diamond / Stone tracking
    totalDiamondsPieces: { type: Number, default: 0 },
    totalDiamondsCarat: { type: Number, default: 0 },
    brokenStonesCount: { type: Number, default: 0 },

    huid: { type: String, trim: true }, // Hallmarking BIS HUID code
    notes: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    stageHistory: [stageHistorySchema],
  },
  { timestamps: true }
);

export const ProductionJob = mongoose.model('ProductionJob', schema);
