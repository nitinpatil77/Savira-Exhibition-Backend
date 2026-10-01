import mongoose from 'mongoose';
import { PRODUCTS, DEMO_TIMELINES, STATUSES, EMAIL_STATUSES } from '../utils/constants.js';

const enquirySchema = new mongoose.Schema(
  {
    enquiryId: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    // Required for new submissions (enforced in validators); optional here so older records stay editable.
    contactNumber: { type: String, trim: true, maxlength: 20, default: '' },
    companyName: { type: String, required: true, trim: true, maxlength: 150 },
    companyLocation: { type: String, required: true, trim: true, maxlength: 150 },
    interestedProducts: {
      type: [{ type: String, enum: PRODUCTS }],
      validate: [(v) => v.length > 0, 'At least one product is required'],
    },
    otherProduct: { type: String, trim: true, maxlength: 150, default: '' },
    interestedInDemo: { type: Boolean, required: true },
    demoTimeline: { type: String, enum: ['', ...DEMO_TIMELINES], default: '' },
    additionalMessage: { type: String, trim: true, maxlength: 2000, default: '' },
    status: { type: String, enum: STATUSES, default: 'New' },
    emailStatus: { type: String, enum: EMAIL_STATUSES, default: 'pending' },
    submissionKey: { type: String },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.submissionKey;
        delete ret.__v;
        return ret;
      },
    },
  },
);

enquirySchema.index({ createdAt: -1 });
enquirySchema.index({ status: 1, createdAt: -1 });
enquirySchema.index({ interestedInDemo: 1, createdAt: -1 });
enquirySchema.index({ interestedProducts: 1, createdAt: -1 });
enquirySchema.index({ email: 1, createdAt: -1 });
enquirySchema.index({ companyName: 1 });
enquirySchema.index({ name: 1 });
enquirySchema.index({ contactNumber: 1 });
enquirySchema.index(
  { submissionKey: 1 },
  { unique: true, partialFilterExpression: { submissionKey: { $type: 'string' } } },
);

export default mongoose.model('Enquiry', enquirySchema);
