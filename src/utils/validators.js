import { PRODUCTS, DEMO_TIMELINES } from './constants.js';

// Practical email check: something@domain.tld, no spaces.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Phone: optional leading +, digits with spaces/dashes/brackets, 7–15 digits in total.
const PHONE_REGEX = /^\+?[\d\s\-()]{7,20}$/;
export const isValidPhone = (value) => PHONE_REGEX.test(value) && /^\d{7,15}$/.test(value.replace(/\D/g, ''));

const clean = (value) => (typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '');

function requiredText(errors, field, value, label, { min = 1, max }) {
  if (!value) errors[field] = `${label} is required`;
  else if (value.length < min) errors[field] = `${label} must be at least ${min} characters`;
  else if (value.length > max) errors[field] = `${label} must be at most ${max} characters`;
}

/**
 * Validates and normalises a public enquiry submission.
 * Only known fields are copied, so unexpected keys (including Mongo operators) are dropped.
 * @returns {{ data?: object, errors?: Record<string, string> }}
 */
export function validateEnquiry(body = {}) {
  const errors = {};

  const name = clean(body.name);
  const email = clean(body.email).toLowerCase();
  const contactNumber = clean(body.contactNumber);
  const companyName = clean(body.companyName);
  const companyLocation = clean(body.companyLocation);
  const additionalMessage = typeof body.additionalMessage === 'string' ? body.additionalMessage.trim() : '';

  requiredText(errors, 'name', name, 'Name', { min: 2, max: 100 });
  if (!email) errors.email = 'Email is required';
  else if (email.length > 254 || !EMAIL_REGEX.test(email)) errors.email = 'Please enter a valid email address';
  if (!contactNumber) errors.contactNumber = 'Contact number is required';
  else if (!isValidPhone(contactNumber)) errors.contactNumber = 'Please enter a valid contact number';
  requiredText(errors, 'companyName', companyName, 'Company name', { max: 150 });
  requiredText(errors, 'companyLocation', companyLocation, 'Company location', { max: 150 });

  const products = Array.isArray(body.interestedProducts) ? body.interestedProducts : [];
  const interestedProducts = [...new Set(products.filter((p) => typeof p === 'string'))];
  if (!interestedProducts.length) errors.interestedProducts = 'Please select at least one product';
  else if (interestedProducts.some((p) => !PRODUCTS.includes(p))) errors.interestedProducts = 'Invalid product selected';

  let otherProduct = '';
  if (interestedProducts.includes('Other')) {
    otherProduct = clean(body.otherProduct);
    if (!otherProduct) errors.otherProduct = 'Please specify the product';
    else if (otherProduct.length > 150) errors.otherProduct = 'Must be at most 150 characters';
  }

  let interestedInDemo = null;
  if (body.interestedInDemo === true || body.interestedInDemo === 'Yes') interestedInDemo = true;
  else if (body.interestedInDemo === false || body.interestedInDemo === 'No') interestedInDemo = false;
  else errors.interestedInDemo = 'Please select Yes or No';

  let demoTimeline = '';
  if (interestedInDemo) {
    demoTimeline = clean(body.demoTimeline);
    if (!DEMO_TIMELINES.includes(demoTimeline)) errors.demoTimeline = 'Please select an expected timeline';
  }

  if (additionalMessage.length > 2000) errors.additionalMessage = 'Message must be at most 2000 characters';

  // Client-generated idempotency key, used to catch double submissions.
  const submissionKey = clean(body.submissionKey);
  if (submissionKey && !/^[A-Za-z0-9-]{8,64}$/.test(submissionKey)) errors.submissionKey = 'Invalid submission key';

  if (Object.keys(errors).length) return { errors };

  return {
    data: {
      name,
      email,
      contactNumber,
      companyName,
      companyLocation,
      interestedProducts,
      otherProduct,
      interestedInDemo,
      demoTimeline,
      additionalMessage,
      ...(submissionKey && { submissionKey }),
    },
  };
}

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
export const isIsoDate = (value) => DATE_REGEX.test(value) && !Number.isNaN(new Date(`${value}T00:00:00`).getTime());
