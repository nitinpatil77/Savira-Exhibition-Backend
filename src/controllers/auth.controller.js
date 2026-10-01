import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import Admin from '../models/Admin.js';
import AppError from '../utils/AppError.js';
import logger from '../utils/logger.js';
import { AUTH_COOKIE, authCookieOptions } from '../middleware/auth.js';

const toPublicAdmin = (admin) => ({ id: admin._id, name: admin.name, email: admin.email, role: admin.role });

export async function login(req, res) {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!email || !password) throw new AppError(400, 'Email and password are required');

  const admin = await Admin.findOne({ email }).select('+password');
  if (!admin || !(await admin.comparePassword(password))) {
    logger.warn(`Admin login failed for ${email} from ${req.ip}`);
    throw new AppError(401, 'Invalid email or password');
  }

  const token = jwt.sign({ sub: admin._id.toString(), role: admin.role }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
  const { exp } = jwt.decode(token);

  res.cookie(AUTH_COOKIE, token, { ...authCookieOptions, expires: new Date(exp * 1000) });
  logger.info(`Admin login: ${admin.email} from ${req.ip}`);
  res.json({ admin: toPublicAdmin(admin) });
}

export function logout(_req, res) {
  res.clearCookie(AUTH_COOKIE, authCookieOptions);
  res.json({ message: 'Logged out' });
}

export function me(req, res) {
  res.json({ admin: toPublicAdmin(req.admin) });
}
