import { Router, Request, Response, type NextFunction } from 'express';
import { Model } from 'mongoose';
import { success, paginated, error } from '../utils/api-response';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/permission';

/**
 * Creates a generic CRUD router for any Mongoose model.
 *
 * Query params (all optional):
 *   ?page=1&limit=50        — pagination
 *   ?search=text             — regex search across searchFields (case-insensitive)
 *   ?sort=field&order=asc    — sort by field (default: createdAt desc)
 *   ?all=true                — include inactive records (default: isActive:true only)
 *
 * @param model          Mongoose model
 * @param searchFields   Field names to search with regex (default: ['name', 'number', 'label'])
 * @param hooks          Lifecycle hooks (e.g. beforeCreate for auto-numbering)
 * @param permPrefix     Prefix for permission codes (e.g. 'office.tenders').
 *                       Если указан, на каждый CRUD-метод вешается permission middleware.
 *                       Формат: <prefix>.view / .create / .edit / .delete
 */
export function createCrudRouter<T>(
  model: Model<T>,
  searchFields: string[] = ['name', 'number', 'label'],
  hooks?: {
    beforeCreate?: (body: Record<string, unknown>) => Promise<void>;
    beforeUpdate?: (body: Record<string, unknown>) => Promise<void>;
  },
  permPrefix?: string,
): Router {
  const router = Router();

  // Если задан permPrefix — декодируем JWT и устанавливаем req.user
  // ДО проверки конкретного разрешения (requirePermission)
  if (permPrefix) {
    router.use(authenticate);
  }

  // noop — заглушка для Express middleware (безопаснее пустого массива)
  const noop = (_req: unknown, _res: unknown, next: NextFunction) => next();
  const p = (action: string) => (permPrefix ? requirePermission(`${permPrefix}.${action}`) : noop);

  // LIST
  router.get('/', p('view'), async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const skip = (page - 1) * limit;
      const filter: Record<string, unknown> = {};

      // isActive filter — only active records by default
      const showAll = req.query.all === 'true';
      if (!showAll) {
        filter.isActive = true;
      }

      // Regex search on designated fields
      const search = req.query.search as string | undefined;
      if (search && searchFields.length > 0) {
        const regex = { $regex: search, $options: 'i' };
        filter.$or = searchFields.map((field) => ({ [field]: regex }));
      }

      // Дополнительные прямые фильтры (любые неизвестные query params → MongoDB filter)
      const knownParams = ['page', 'limit', 'search', 'sort', 'order', 'all'];
      for (const key of Object.keys(req.query)) {
        if (!knownParams.includes(key) && req.query[key]) {
          filter[key] = req.query[key];
        }
      }

      // Sort
      const sortField = (req.query.sort as string) || 'createdAt';
      const sortOrder = (req.query.order as string) === 'asc' ? 1 : -1;
      const sort: Record<string, 1 | -1> = { [sortField]: sortOrder };

      const [data, total] = await Promise.all([
        model.find(filter).sort(sort).skip(skip).limit(limit),
        model.countDocuments(filter),
      ]);

      res.json(paginated(data, total, page, limit));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      res.status(500).json(error(message));
    }
  });

  // GET BY ID
  router.get('/:id', p('view'), async (req: Request, res: Response) => {
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
  router.post('/', p('create'), async (req: Request, res: Response) => {
    try {
      if (hooks?.beforeCreate) {
        await hooks.beforeCreate(req.body);
      }
      const doc = await model.create(req.body);
      res.status(201).json(success(doc, 'Created'));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      res.status(400).json(error(message));
    }
  });

  // UPDATE
  router.put('/:id', p('edit'), async (req: Request, res: Response) => {
    try {
      if (hooks?.beforeUpdate) {
        await hooks.beforeUpdate(req.body);
      }
      const doc = await model.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
      if (!doc) { res.status(404).json(error('Not found')); return; }
      res.json(success(doc, 'Updated'));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      res.status(400).json(error(message));
    }
  });

  // DELETE
  router.delete('/:id', p('delete'), async (req: Request, res: Response) => {
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
