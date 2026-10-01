import mongoose from 'mongoose';
import env from './env.js';
import logger from '../utils/logger.js';

const RETRY_DELAY_MS = 5000;

mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
mongoose.connection.on('reconnected', () => logger.info('MongoDB reconnected'));
mongoose.connection.on('error', (err) => logger.error(`MongoDB error: ${err.message}`));

/**
 * Connects to MongoDB, retrying until it succeeds so the API can start
 * before the database is up. After the first connection Mongoose
 * reconnects automatically.
 */
export async function connectDB() {
  for (;;) {
    try {
      await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 5000 });
      logger.info(`MongoDB connected (${mongoose.connection.host}/${mongoose.connection.name})`);
      return;
    } catch (err) {
      logger.error(`MongoDB connection failed: ${err.message}. Retrying in ${RETRY_DELAY_MS / 1000}s`);
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }
}

export const isDbConnected = () => mongoose.connection.readyState === 1;
