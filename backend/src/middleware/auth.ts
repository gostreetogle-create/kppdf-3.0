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
  let token: string | undefined;
  try {
    token = extractAccessToken(req);
  } catch {
    res.status(401).json(error('Unauthorized: invalid session'));
    return;
  }

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
