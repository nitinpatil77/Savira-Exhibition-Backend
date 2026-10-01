const pad = (n) => String(n).padStart(2, '0');

/** Formats a date as "DD-MM-YYYY HH:mm" in the server timezone (APP_TIMEZONE). */
export function formatDateTime(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatProducts(enquiry) {
  return enquiry.interestedProducts
    .map((p) => (p === 'Other' && enquiry.otherProduct ? `Other (${enquiry.otherProduct})` : p))
    .join(', ');
}

export const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const escapeHtml = (text) =>
  String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
