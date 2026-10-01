import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import Admin from '../models/Admin.js';
import AppError from '../utils/AppError.js';

export const AUTH_COOKIE = 'savira_admin_token';

export const authCookieOptions = {
  httpOnly: true,
  secure: env.cookieSecure,
  sameSite: 'strict',
  path: '/api',
};

/** Requires a valid admin JWT (httpOnly cookie, or Bearer header for API tools). */
export async function requireAuth(req, _res, next) {
  const header = req.headers.authorization;
  const token = req.cookies?.[AUTH_COOKIE] || (header?.startsWith('Bearer ') ? header.slice(7) : null);
  if (!token) throw new AppError(401, 'Authentication required');

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch (err) {
    if (err.name === 'TokenExpiredError') throw new AppError(401, 'Session expired. Please log in again.');
    throw new AppError(401, 'Invalid session. Please log in again.');
  }

  const admin = await Admin.findById(payload.sub);
  if (!admin) throw new AppError(401, 'Invalid session. Please log in again.');

  req.admin = admin;
  next();
}
