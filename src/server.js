import env from './config/env.js';
import mongoose from 'mongoose';
import app from './app.js';
import { connectDB } from './config/db.js';
import { verifyEmailTransport } from './services/email.service.js';
import logger from './utils/logger.js';

process.on('unhandledRejection', (reason) => {
  logger.error(`Unhandled promise rejection: ${reason?.stack || reason}`);
});

const server = app.listen(env.port, () => {
  logger.info(`API listening on port ${env.port} (${env.isProduction ? 'production' : 'development'}, TZ=${process.env.TZ})`);
});

connectDB();
verifyEmailTransport();

async function shutdown(signal) {
  logger.info(`${signal} received, shutting down`);
  server.close(async () => {
    await mongoose.connection.close().catch(() => {});
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
