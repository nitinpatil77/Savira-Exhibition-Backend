import mongoose from 'mongoose';
import Enquiry from '../models/Enquiry.js';
import AppError from '../utils/AppError.js';
import logger from '../utils/logger.js';
import { validateEnquiry, isIsoDate } from '../utils/validators.js';
import { escapeRegex, formatDateTime, formatProducts } from '../utils/format.js';
import { PRODUCTS, STATUSES, DUPLICATE_WINDOW_MS } from '../utils/constants.js';
import { nextEnquiryId } from '../services/enquiryId.service.js';
import { sendVisitorThankYou, sendAdminNotification } from '../services/email.service.js';

// How long the visitor waits for the thank-you email before we respond anyway.
const EMAIL_WAIT_MS = 8000;

const visitorResponse = (enquiry, extra = {}) => ({
  message: 'Thank you for your interest!',
  enquiryId: enquiry.enquiryId,
  ...extra,
});

/* ---------------------------------- Public ---------------------------------- */

export async function createEnquiry(req, res) {
  const { data, errors } = validateEnquiry(req.body);
  if (errors) throw new AppError(400, 'Please correct the highlighted fields.', errors);

  // Duplicate protection: same form submitted twice (retry / double tap) ...
  if (data.submissionKey) {
    const existing = await Enquiry.findOne({ submissionKey: data.submissionKey });
    if (existing) return res.status(200).json(visitorResponse(existing, { duplicate: true }));
  }
  // ... or the same visitor submitting again within a short window.
  const recent = await Enquiry.findOne({
    email: data.email,
    createdAt: { $gte: new Date(Date.now() - DUPLICATE_WINDOW_MS) },
  }).sort({ createdAt: -1 });
  if (recent) {
    logger.warn(`Duplicate submission ignored for ${data.email} (existing ${recent.enquiryId})`);
    return res.status(200).json(visitorResponse(recent, { duplicate: true }));
  }

  let enquiry;
  try {
    enquiry = await Enquiry.create({ ...data, enquiryId: await nextEnquiryId() });
  } catch (err) {
    // Two identical requests raced past the check above.
    if (err.code === 11000 && err.keyPattern?.submissionKey) {
      const existing = await Enquiry.findOne({ submissionKey: data.submissionKey });
      if (existing) return res.status(200).json(visitorResponse(existing, { duplicate: true }));
    }
    throw err;
  }
  logger.info(`New enquiry ${enquiry.enquiryId}: ${enquiry.name} <${enquiry.email}>, ${enquiry.companyName}`);

  // The enquiry is safely stored. Email failures are logged and recorded, never rolled back.
  const emailDone = sendVisitorThankYou(enquiry).then(async (emailStatus) => {
    try {
      await Enquiry.updateOne({ _id: enquiry._id }, { emailStatus });
    } catch (err) {
      logger.error(`Could not record email status for ${enquiry.enquiryId}: ${err.message}`);
    }
    return emailStatus;
  });
  sendAdminNotification(enquiry);

  const emailStatus = await Promise.race([
    emailDone,
    new Promise((resolve) => setTimeout(() => resolve('pending'), EMAIL_WAIT_MS)),
  ]);

  res.status(201).json(visitorResponse(enquiry, { emailSent: emailStatus === 'sent' }));
}

/* ---------------------------------- Admin ----------------------------------- */

const queryString = (value) => (typeof value === 'string' ? value.trim() : '');

/** Builds a MongoDB filter from admin search/filter query params. */
function buildFilter(query) {
  const filter = {};

  const search = queryString(query.search).slice(0, 100);
  if (search) {
    const regex = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ name: regex }, { companyName: regex }, { email: regex }, { contactNumber: regex }, { enquiryId: regex }];
  }

  const product = queryString(query.product);
  if (PRODUCTS.includes(product)) filter.interestedProducts = product;

  const status = queryString(query.status);
  if (STATUSES.includes(status)) filter.status = status;

  const demo = queryString(query.demo).toLowerCase();
  if (demo === 'yes') filter.interestedInDemo = true;
  else if (demo === 'no') filter.interestedInDemo = false;

  const from = queryString(query.from);
  const to = queryString(query.to);
  if (isIsoDate(from) || isIsoDate(to)) {
    filter.createdAt = {};
    if (isIsoDate(from)) filter.createdAt.$gte = new Date(`${from}T00:00:00`);
    if (isIsoDate(to)) filter.createdAt.$lte = new Date(`${to}T23:59:59.999`);
  }

  return filter;
}

export async function listEnquiries(req, res) {
  const filter = buildFilter(req.query);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);

  const [items, total] = await Promise.all([
    Enquiry.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Enquiry.countDocuments(filter),
  ]);

  res.json({ items, total, page, pages: Math.max(Math.ceil(total / limit), 1), limit });
}

function findByIdOr404(id) {
  if (!mongoose.isValidObjectId(id)) throw new AppError(404, 'Enquiry not found');
  return Enquiry.findById(id).then((enquiry) => {
    if (!enquiry) throw new AppError(404, 'Enquiry not found');
    return enquiry;
  });
}

export async function getEnquiry(req, res) {
  res.json({ enquiry: await findByIdOr404(req.params.id) });
}

export async function updateEnquiry(req, res) {
  const status = typeof req.body?.status === 'string' ? req.body.status : '';
  if (!STATUSES.includes(status)) {
    throw new AppError(400, 'Invalid status', { status: `Status must be one of: ${STATUSES.join(', ')}` });
  }

  const enquiry = await findByIdOr404(req.params.id);
  const previous = enquiry.status;
  if (previous !== status) {
    enquiry.status = status;
    await enquiry.save();
    logger.info(`Status update ${enquiry.enquiryId}: ${previous} -> ${status} by ${req.admin.email}`);
  }
  res.json({ enquiry });
}

const CSV_COLUMNS = [
  ['Enquiry ID', (e) => e.enquiryId],
  ['Date', (e) => formatDateTime(e.createdAt)],
  ['Name', (e) => e.name],
  ['Email', (e) => e.email],
  ['Contact Number', (e) => e.contactNumber],
  ['Company Name', (e) => e.companyName],
  ['Company Location', (e) => e.companyLocation],
  ['Interested Products', (e) => formatProducts(e)],
  ['Demo/Trial', (e) => (e.interestedInDemo ? 'Yes' : 'No')],
  ['Expected Timeline', (e) => e.demoTimeline],
  ['Additional Requirements', (e) => e.additionalMessage],
  ['Status', (e) => e.status],
];

function csvCell(value) {
  let text = String(value ?? '');
  // Prevent spreadsheet formula injection.
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export async function exportEnquiries(req, res) {
  const enquiries = await Enquiry.find(buildFilter(req.query)).sort({ createdAt: -1 }).lean();

  const lines = [
    CSV_COLUMNS.map(([header]) => csvCell(header)).join(','),
    ...enquiries.map((e) => CSV_COLUMNS.map(([, get]) => csvCell(get(e))).join(',')),
  ];

  const date = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="savira-enquiries-${date}.csv"`);
  // BOM so Excel opens UTF-8 correctly.
  res.send(`﻿${lines.join('\r\n')}\r\n`);
  logger.info(`CSV export: ${enquiries.length} enquiries by ${req.admin.email}`);
}
