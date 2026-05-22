import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { success } from '../../utils/api-response';

export const healthRouter = Router();

healthRouter.get('/', (_req: Request, res: Response) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = ['disconnected', 'connected', 'connecting', 'disconnecting'];

  res.json(success({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    mongodb: dbStatus[dbState] || 'unknown',
  }));
});
