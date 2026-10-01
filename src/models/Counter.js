import mongoose from 'mongoose';

// Atomic sequence per key (e.g. "enquiry-2026") used to build readable enquiry IDs.
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

export default mongoose.model('Counter', counterSchema);
