import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import env from './config/env.js';
import { isDbConnected } from './config/db.js';
import sanitize from './middleware/sanitize.js';
import { requireDb, notFound, errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.routes.js';
import enquiryRoutes from './routes/enquiry.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', env.trustProxy); // Behind Nginx: use the real client IP for rate limiting
app.set('query parser', 'simple'); // Flat query strings only (no nested objects)

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      // Same-origin requests and tools without an Origin header are allowed.
      callback(null, !origin || env.clientUrls.includes(origin));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: '20kb' }));
app.use(cookieParser());
app.use(sanitize);

app.get('/api/health', (_req, res) => {
  const db = isDbConnected();
  res.status(db ? 200 : 503).json({ status: db ? 'ok' : 'degraded', database: db ? 'connected' : 'disconnected' });
});

app.use('/api', requireDb);
app.use('/api/auth', authRoutes);
app.use('/api/enquiries', enquiryRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
