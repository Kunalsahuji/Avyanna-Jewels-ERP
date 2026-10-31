import mongoose from 'mongoose';

const counterSchema = new mongoose.Schema({ _id: String, seq: { type: Number, default: 0 } });
const Counter = mongoose.model('Counter', counterSchema);

// Atomic, gap-free sequence per key — used for TSK-000001 / TKT-000001 style IDs
export async function nextSeq(key, pad = 6) {
  const c = await Counter.findByIdAndUpdate(key, { $inc: { seq: 1 } }, { new: true, upsert: true });
  return String(c.seq).padStart(pad, '0');
}
