import { Router, type Request, type Response } from 'express';
import mongoose from 'mongoose';
import { createCrudRouter } from '../utils/crud-factory';

// Express 5 убрал поле `methods` с IRoute<string> в публичных типах,
// но оно остаётся в runtime для интроспекции. Описываем shape вручную для тестов.
interface RouterLayer {
  route?: {
    path?: string;
    methods?: Record<string, boolean>;
    stack?: {
      handle: (req: Request, res: Response, next?: () => void) => void | Promise<void>;
    }[];
  };
}

// Mock query chain for model.find()
const mockQueryChain = {
  sort: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
};

// Mock mongoose model
const mockModel = {
  find: jest.fn().mockReturnValue(mockQueryChain),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
  countDocuments: jest.fn(),
  create: jest.fn(),
};

// Helper: make a fake express Request
function mockReq(overrides: Partial<Request['query']> = {}): Request {
  return {
    query: { page: '1', limit: '50', ...overrides },
  } as unknown as Request;
}

// Helper: make a fake express Response with spied json/status
function mockRes(): { res: Response; jsonSpy: jest.Mock; statusSpy: jest.Mock } {
  const jsonSpy = jest.fn().mockReturnThis();
  const statusSpy = jest.fn().mockReturnValue({ json: jsonSpy });
  const res = {
    json: jsonSpy,
    status: statusSpy,
  } as unknown as Response;
  return { res, jsonSpy, statusSpy };
}

// Extract the list handler (GET /) from the router
function getListHandler(router: Router): (req: Request, res: Response) => void | Promise<void> {
  const stack = router.stack as unknown as RouterLayer[];
  const listRoute = stack.find(
    (layer) => layer.route?.path === '/' && layer.route?.methods?.['get'],
  );
  const handlers = listRoute?.route?.stack;
  if (!handlers || handlers.length === 0) throw new Error('List handler not found');
  // Берём ПОСЛЕДНИЙ обработчик в стеке — это настоящий route handler,
  // а не middleware (noop/requirePermission), которые идут первыми.
  const handler = handlers[handlers.length - 1]?.handle;
  if (!handler) throw new Error('List handler not found');
  return handler;
}

describe('CRUD Factory', () => {
  let router: Router;
  let stack: RouterLayer[];

  beforeEach(() => {
    jest.clearAllMocks();
    router = createCrudRouter(mockModel as unknown as mongoose.Model<unknown>);
    stack = router.stack as unknown as RouterLayer[];
  });

  describe('Route structure', () => {
    it('should create a router with CRUD routes', () => {
      expect(router).toBeDefined();
      const methods = stack
        .map((layer) => (layer.route?.methods ? Object.keys(layer.route.methods) : []))
        .flat();

      expect(methods).toContain('get');
      expect(methods).toContain('post');
      expect(methods).toContain('put');
      expect(methods).toContain('delete');
    });

    it('should have 5 routes (list, get, create, update, delete)', () => {
      expect(stack.length).toBeGreaterThanOrEqual(5);
    });

    it('should have a GET / route for listing', () => {
      const listRoute = stack.find(
        (layer) => layer.route?.path === '/' && layer.route?.methods?.['get'],
      );
      expect(listRoute).toBeDefined();
    });

    it('should have a GET /:id route for single retrieval', () => {
      const getRoute = stack.find(
        (layer) => layer.route?.path === '/:id' && layer.route?.methods?.['get'],
      );
      expect(getRoute).toBeDefined();
    });

    it('should have a POST / route for creation', () => {
      const postRoute = stack.find(
        (layer) => layer.route?.path === '/' && layer.route?.methods?.['post'],
      );
      expect(postRoute).toBeDefined();
    });

    it('should have a PUT /:id route for update', () => {
      const putRoute = stack.find(
        (layer) => layer.route?.path === '/:id' && layer.route?.methods?.['put'],
      );
      expect(putRoute).toBeDefined();
    });

    it('should have a DELETE /:id route for deletion', () => {
      const deleteRoute = stack.find(
        (layer) => layer.route?.path === '/:id' && layer.route?.methods?.['delete'],
      );
      expect(deleteRoute).toBeDefined();
    });
  });

  describe('List handler — isActive filter', () => {
    it('should apply isActive=true filter by default', async () => {
      mockModel.countDocuments.mockResolvedValue(0);
      const handler = getListHandler(router);
      const { res, jsonSpy } = mockRes();

      await handler(mockReq(), res);

      expect(mockModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: true }),
      );
      expect(mockModel.countDocuments).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: true }),
      );
      expect(jsonSpy).toHaveBeenCalled();
    });

    it('should skip isActive filter when ?all=true', async () => {
      mockModel.countDocuments.mockResolvedValue(0);
      const handler = getListHandler(router);
      const { res, jsonSpy } = mockRes();

      await handler(mockReq({ all: 'true' }), res);

      const findArg = mockModel.find.mock.calls[0]?.[0] as Record<string, unknown> | undefined;
      expect(findArg?.isActive).toBeUndefined();
      expect(mockModel.countDocuments).toHaveBeenCalledWith(
        expect.not.objectContaining({ isActive: expect.anything() as unknown }),
      );
      expect(jsonSpy).toHaveBeenCalled();
    });
  });

  describe('List handler — regex search', () => {
    it('should apply $or regex on default searchFields', async () => {
      mockModel.countDocuments.mockResolvedValue(0);
      const handler = getListHandler(router);
      const { res, jsonSpy } = mockRes();

      await handler(mockReq({ search: 'test' }), res);

      const findArg = mockModel.find.mock.calls[0]?.[0] as Record<string, unknown>;
      expect(findArg.$or).toBeDefined();
      const or = findArg.$or as Record<string, unknown>[];
      expect(or.length).toBeGreaterThanOrEqual(1);
      // Default searchFields: ['name', 'number', 'label']
      const fields = or.map((c) => Object.keys(c)[0]);
      expect(fields).toContain('name');
      expect(fields).toContain('number');
      expect(fields).toContain('label');
    });

    it('should not apply $or when search is empty', async () => {
      mockModel.countDocuments.mockResolvedValue(0);
      const handler = getListHandler(router);
      const { res } = mockRes();

      await handler(mockReq({ search: '' }), res);

      const findArg = mockModel.find.mock.calls[0]?.[0] as Record<string, unknown>;
      expect(findArg.$or).toBeUndefined();
    });
  });

  describe('List handler — sort', () => {
    it('should sort by createdAt desc by default', async () => {
      mockModel.countDocuments.mockResolvedValue(0);
      const handler = getListHandler(router);
      const { res, jsonSpy } = mockRes();

      await handler(mockReq(), res);

      expect(mockQueryChain.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(jsonSpy).toHaveBeenCalled();
    });

    it('should sort by custom field and asc order', async () => {
      mockModel.countDocuments.mockResolvedValue(0);
      const handler = getListHandler(router);
      const { res, jsonSpy } = mockRes();

      await handler(mockReq({ sort: 'name', order: 'asc' }), res);

      expect(mockQueryChain.sort).toHaveBeenCalledWith({ name: 1 });
      expect(jsonSpy).toHaveBeenCalled();
    });

    it('should sort by custom field and desc order', async () => {
      mockModel.countDocuments.mockResolvedValue(0);
      const handler = getListHandler(router);
      const { res, jsonSpy } = mockRes();

      await handler(mockReq({ sort: 'name', order: 'desc' }), res);

      expect(mockQueryChain.sort).toHaveBeenCalledWith({ name: -1 });
      expect(jsonSpy).toHaveBeenCalled();
    });
  });

  describe('List handler — combined query params', () => {
    it('should combine isActive+search+sort', async () => {
      mockModel.countDocuments.mockResolvedValue(0);
      const handler = getListHandler(router);
      const { res, jsonSpy } = mockRes();

      await handler(mockReq({ search: 'bolt', sort: 'name', order: 'asc' }), res);

      const findArg = mockModel.find.mock.calls[0]?.[0] as Record<string, unknown>;
      expect(findArg.isActive).toBe(true);
      expect(findArg.$or).toBeDefined();
      expect(mockQueryChain.sort).toHaveBeenCalledWith({ name: 1 });
      expect(mockModel.countDocuments).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: true }),
      );
      expect(jsonSpy).toHaveBeenCalled();
    });
  });
});
