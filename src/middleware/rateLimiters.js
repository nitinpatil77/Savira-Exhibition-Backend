import rateLimit from 'express-rate-limit';

const json = (message) => ({ message });

// Generous enough for many visitors behind one exhibition Wi-Fi (shared IP),
// strict enough to stop scripted spam.
export const enquiryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.ENQUIRY_RATE_LIMIT) || 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: json('Too many submissions from this network. Please try again in a few minutes.'),
});

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: json('Too many login attempts. Please try again in 15 minutes.'),
});
