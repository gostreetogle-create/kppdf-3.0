import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { error } from '../utils/api-response';
import { extractAccessToken } from '../utils/auth-cookies';
import type { JwtPayload, AuthRequest } from '../types/auth';

/**
 * JWT authentication middleware.
 * Verifies access token from Bearer header or httpOnly cookie.
 */
export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const token = extractAccessToken(req);
  if (!token) {
    res.status(401).json(error('Unauthorized: no token provided'));
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
    req.user = decoded;
    next();
  } catch {
    res.status(401).json(error('Unauthorized: invalid or expired token'));
  }
}
