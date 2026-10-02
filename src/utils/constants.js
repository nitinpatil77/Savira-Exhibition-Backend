// Product list, demo timelines and statuses live in shared/constants.mjs (used by frontend too).
export { OTHER_PRODUCT, PRODUCTS, DEMO_TIMELINES, STATUSES } from '../../../shared/constants.mjs';

export const EMAIL_STATUSES = ['pending', 'sent', 'failed', 'skipped'];

// A second submission from the same email within this window is treated as a duplicate.
export const DUPLICATE_WINDOW_MS = 2 * 60 * 1000;
