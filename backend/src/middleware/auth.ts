import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { error } from '../utils/api-response';
import type { JwtPayload, AuthRequest } from '../types/auth';

/**
 * JWT authentication middleware.
 * Extracts and verifies Bearer token, attaches user to request.
 */
export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json(error('Unauthorized: no token provided'));
    return;
  }

  const token = header.slice(7);
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
    req.user = decoded;
    next();
  } catch {
    res.status(401).json(error('Unauthorized: invalid or expired token'));
  }
}
