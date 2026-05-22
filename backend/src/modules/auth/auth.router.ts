import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import { AuthService } from './auth.service';
import { success, error } from '../../utils/api-response';
import { loginRules, validate } from '../../middleware/validate';
import type { LoginBody } from '../../types/auth';

export const authRouter = Router();
const authService = new AuthService();

// POST /api/v1/auth/login
authRouter.post('/login', loginRules, validate, async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body as LoginBody;

    const tokens = await authService.login(username, password);
    if (!tokens) {
      res.status(401).json(error('Invalid credentials'));
      return;
    }

    res.json(success(tokens, 'Login successful'));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Login failed';
    res.status(500).json(error(message));
  }
});

// POST /api/v1/auth/refresh
authRouter.post('/refresh',
  body('refreshToken').notEmpty().withMessage('Refresh token is required'),
  validate,
  async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body as { refreshToken: string };

    const tokens = await authService.refresh(refreshToken);
    if (!tokens) {
      res.status(401).json(error('Invalid or expired refresh token'));
      return;
    }

    res.json(success(tokens, 'Token refreshed'));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Refresh failed';
    res.status(500).json(error(message));
  }
});
