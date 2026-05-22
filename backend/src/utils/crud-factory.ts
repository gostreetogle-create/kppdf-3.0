import { Router, Request, Response } from 'express';
import { Model } from 'mongoose';
import { success, paginated, error } from '../utils/api-response';

export function createCrudRouter<T>(model: Model<T>): Router {
  const router = Router();

  // LIST
  router.get('/', async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const skip = (page - 1) * limit;
      const filter: Record<string, unknown> = {};

      if (req.query.search) {
        filter.$text = { $search: req.query.search };
      }

      const [data, total] = await Promise.all([
        model.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
        model.countDocuments(filter),
      ]);

      res.json(paginated(data, total, page, limit));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      res.status(500).json(error(message));
    }
  });

  // GET BY ID
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const doc = await model.findById(req.params.id);
      if (!doc) { res.status(404).json(error('Not found')); return; }
      res.json(success(doc));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      res.status(500).json(error(message));
    }
  });

  // CREATE
  router.post('/', async (req: Request, res: Response) => {
    try {
      const doc = await model.create(req.body);
      res.status(201).json(success(doc, 'Created'));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      res.status(400).json(error(message));
    }
  });

  // UPDATE
  router.put('/:id', async (req: Request, res: Response) => {
    try {
      const doc = await model.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
      if (!doc) { res.status(404).json(error('Not found')); return; }
      res.json(success(doc, 'Updated'));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      res.status(400).json(error(message));
    }
  });

  // DELETE
  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      const doc = await model.findByIdAndDelete(req.params.id);
      if (!doc) { res.status(404).json(error('Not found')); return; }
      res.json(success(null, 'Deleted'));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      res.status(500).json(error(message));
    }
  });

  return router;
}
