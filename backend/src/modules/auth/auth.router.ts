import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import { AuthService } from './auth.service';
import { success, error } from '../../utils/api-response';
import { loginRules, validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/auth';
import {
  setAuthCookies,
  clearAuthCookies,
  extractRefreshToken,
} from '../../utils/auth-cookies';
import type { AuthRequest, AuthUserProfile, LoginBody } from '../../types/auth';

export const authRouter = Router();
const authService = new AuthService();

function toProfile(payload: {
  userId: string;
  username: string;
  role: string;
  permissions: string[];
}): AuthUserProfile {
  return {
    userId: payload.userId,
    username: payload.username,
    role: payload.role,
    permissions: payload.permissions ?? [],
  };
}

// POST /api/v1/auth/login
authRouter.post('/login', loginRules, validate, async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body as LoginBody;

    const tokens = await authService.login(username, password);
    if (!tokens) {
      res.status(401).json(error('Invalid credentials'));
      return;
    }

    setAuthCookies(res, tokens);
    const profile = authService.profileFromAccessToken(tokens.accessToken);
    res.json(success(profile, 'Login successful'));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Login failed';
    res.status(500).json(error(message));
  }
});

// POST /api/v1/auth/refresh
authRouter.post('/refresh',
  body('refreshToken').optional(),
  validate,
  async (req: Request, res: Response) => {
  try {
    const bodyToken = typeof req.body?.refreshToken === 'string' ? req.body.refreshToken : undefined;
    const refreshToken = extractRefreshToken(req, bodyToken);
    if (!refreshToken) {
      res.status(401).json(error('Refresh token is required'));
      return;
    }

    const tokens = await authService.refresh(refreshToken);
    if (!tokens) {
      res.status(401).json(error('Invalid or expired refresh token'));
      return;
    }

    setAuthCookies(res, tokens);
    const profile = authService.profileFromAccessToken(tokens.accessToken);
    res.json(success(profile, 'Token refreshed'));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Refresh failed';
    res.status(500).json(error(message));
  }
});

// POST /api/v1/auth/logout
authRouter.post('/logout', (_req: Request, res: Response) => {
  clearAuthCookies(res);
  res.json(success(null, 'Logged out'));
});

// GET /api/v1/auth/me
authRouter.get('/me', authenticate, (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json(error('Unauthorized'));
    return;
  }
  res.json(success(toProfile(req.user)));
});
