import { isDbConnected } from '../config/db.js';
import logger from '../utils/logger.js';

/** Returns 503 straight away when MongoDB is down, instead of hanging the request. */
export function requireDb(_req, res, next) {
  if (!isDbConnected()) {
    return res.status(503).json({ message: 'Service temporarily unavailable. Please try again shortly.' });
  }
  next();
}

export function notFound(req, res) {
  res.status(404).json({ message: `Not found: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Invalid JSON in request body' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Request body too large' });
  }
  if (err.statusCode && err.statusCode < 500) {
    return res.status(err.statusCode).json({ message: err.message, ...(err.errors && { errors: err.errors }) });
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ message: 'Invalid identifier' });
  }
  if (err.name === 'ValidationError') {
    const errors = Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v.message]));
    return res.status(400).json({ message: 'Validation failed', errors });
  }
  if (['MongoServerSelectionError', 'MongoNetworkError', 'MongoNotConnectedError'].includes(err.name)) {
    logger.error(`Database unavailable on ${req.method} ${req.originalUrl}: ${err.message}`);
    return res.status(503).json({ message: 'Service temporarily unavailable. Please try again shortly.' });
  }

  logger.error(`Unhandled error on ${req.method} ${req.originalUrl}: ${err.stack || err.message}`);
  res.status(500).json({ message: 'Something went wrong. Please try again.' });
}
