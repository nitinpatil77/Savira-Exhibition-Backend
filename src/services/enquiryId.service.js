import Counter from '../models/Counter.js';

/** Returns the next enquiry ID for the current year, e.g. "EXH-2026-0001". */
export async function nextEnquiryId() {
  const year = new Date().getFullYear();
  const counter = await Counter.findOneAndUpdate(
    { _id: `enquiry-${year}` },
    { $inc: { seq: 1 } },
    { returnDocument: 'after', upsert: true },
  );
  return `EXH-${year}-${String(counter.seq).padStart(4, '0')}`;
}
