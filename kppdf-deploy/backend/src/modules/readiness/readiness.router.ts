import { Router, Response } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../../middleware/auth';
import { requirePermission } from '../../middleware/permission';
import { validate } from '../../middleware/validate';
import { success, error } from '../../utils/api-response';
import type { AuthRequest } from '../../types/auth';
import {
  ReadinessFeedbackService,
  type FeedbackSeverity,
} from './readiness-feedback.service';

export const readinessRouter = Router();
const feedbackService = new ReadinessFeedbackService();

const FEEDBACK_EDIT_PERM = 'admin.settings.edit';

readinessRouter.get('/feedback', authenticate, (_req: AuthRequest, res: Response) => {
  try {
    res.json(success(feedbackService.getFeedback()));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json(error(message));
  }
});

const saveRules = [
  body('module_key').isString().trim().notEmpty(),
  body('checklist_id').isString().trim().notEmpty(),
  body('dispute').isBoolean(),
  body('description').isString().trim().isLength({ min: 3 }),
  body('severity').isIn(['P1', 'P2', 'P3']),
];

readinessRouter.post(
  '/feedback',
  authenticate,
  requirePermission(FEEDBACK_EDIT_PERM),
  saveRules,
  validate,
  (req: AuthRequest, res: Response) => {
    try {
      const issue = feedbackService.saveIssue({
        module_key: String(req.body.module_key),
        checklist_id: String(req.body.checklist_id),
        dispute: Boolean(req.body.dispute),
        description: String(req.body.description),
        severity: req.body.severity as FeedbackSeverity,
        created_by: req.user?.username ?? 'unknown',
      });
      res.status(201).json(success(issue, 'Feedback saved'));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      res.status(500).json(error(message));
    }
  },
);

readinessRouter.patch(
  '/feedback/:id',
  authenticate,
  requirePermission(FEEDBACK_EDIT_PERM),
  body('resolution_note').optional().isString(),
  validate,
  (req: AuthRequest, res: Response) => {
    try {
      const issue = feedbackService.resolveIssue({
        id: String(req.params.id),
        resolution_note: req.body.resolution_note ? String(req.body.resolution_note) : undefined,
      });
      res.json(success(issue, 'Issue resolved'));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      const status = message === 'Issue not found' ? 404 : 500;
      res.status(status).json(error(message));
    }
  },
);
