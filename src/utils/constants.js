// Keep these lists in sync with frontend/src/utils/constants.js
export const PRODUCTS = [
  'AGV',
  'AMR',
  'Automated Forklift',
  'Warehouse Management System (WMS)',
  'Fleet Management System (FMS)',
  'Warehouse Automation',
  'Material Handling Automation',
  'Custom Automation Solution',
  'Other',
];

export const DEMO_TIMELINES = [
  'Immediately',
  'Within 1 Week',
  'Within 1 Month',
  'Within 3 Months',
  'More than 3 Months',
  'Not Decided',
];

export const STATUSES = ['New', 'Contacted', 'Demo Planned', 'Trial Planned', 'Converted', 'Closed'];

export const EMAIL_STATUSES = ['pending', 'sent', 'failed', 'skipped'];

// A second submission from the same email within this window is treated as a duplicate.
export const DUPLICATE_WINDOW_MS = 2 * 60 * 1000;
