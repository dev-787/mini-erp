import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { findUserById } from '../db/index.js';
import { AuthenticatedRequest, JWTAccessPayload, UserRole } from '../types/auth.js';

/**
 * Middleware to authenticate requests via access_token httpOnly cookie
 * (or Authorization header as fallback).
 */
export const authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    let token = req.cookies?.access_token;

    if (!token && req.headers.authorization) {
      const parts = req.headers.authorization.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        token = parts[1];
      }
    }

    if (!token) {
      return res.status(401).json({ message: 'Authentication required. No token provided.' });
    }

    const decoded = jwt.verify(token, config.jwtAccessSecret) as JWTAccessPayload;
    const user = await findUserById(decoded.id);

    if (!user || user.status === 'disabled') {
      return res.status(401).json({ message: 'User account is inactive or no longer exists.' });
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Access token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ message: 'Invalid authentication token.' });
  }
};

/**
 * Middleware to restrict access based on user role.
 */
export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): any => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Forbidden. Role '${req.user.role}' is not authorized to access this resource.`,
      });
    }

    next();
  };
};

/**
 * Simple rate limiter to protect sensitive endpoints from brute force attempts
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export const rateLimiter = (options = { windowMs: 15 * 60 * 1000, max: 15 }) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): any => {
    const ip = req.ip || (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
    const key = `${req.path}:${ip}`;
    const now = Date.now();

    const record = rateLimitMap.get(key) || { count: 0, resetTime: now + options.windowMs };

    if (now > record.resetTime) {
      record.count = 0;
      record.resetTime = now + options.windowMs;
    }

    record.count++;
    rateLimitMap.set(key, record);

    if (record.count > options.max) {
      return res.status(429).json({
        message: 'Too many requests. Please try again later.',
      });
    }

    next();
  };
};
