import { Router } from 'express';
import mongoose from 'mongoose';
import { createCrudRouter } from '../utils/crud-factory';

// Mock mongoose model
const mockModel = {
  find: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
  countDocuments: jest.fn(),
  create: jest.fn(),
};

describe('CRUD Factory', () => {
  let router: Router;

  beforeEach(() => {
    jest.clearAllMocks();
    router = createCrudRouter(mockModel as unknown as mongoose.Model<unknown>);
  });

  it('should create a router with CRUD routes', () => {
    expect(router).toBeDefined();
    // Router should have at least these methods: get, post, put, delete
    const stack = router.stack;
    const methods = stack.map((layer: { route?: { methods?: Record<string, boolean> } }) =>
      layer.route?.methods ? Object.keys(layer.route.methods) : [],
    ).flat();

    expect(methods).toContain('get');
    expect(methods).toContain('post');
    expect(methods).toContain('put');
    expect(methods).toContain('delete');
  });

  it('should have 5 routes (list, get, create, update, delete)', () => {
    const stack = router.stack;
    // GET /, GET /:id, POST /, PUT /:id, DELETE /:id
    expect(stack.length).toBeGreaterThanOrEqual(5);
  });

  it('should have a GET / route for listing', () => {
    const listRoute = router.stack.find(
      (layer) => layer.route?.path === '/' && layer.route?.methods?.get,
    );
    expect(listRoute).toBeDefined();
  });

  it('should have a GET /:id route for single retrieval', () => {
    const getRoute = router.stack.find(
      (layer) => layer.route?.path === '/:id' && layer.route?.methods?.get,
    );
    expect(getRoute).toBeDefined();
  });

  it('should have a POST / route for creation', () => {
    const postRoute = router.stack.find(
      (layer) => layer.route?.path === '/' && layer.route?.methods?.post,
    );
    expect(postRoute).toBeDefined();
  });

  it('should have a PUT /:id route for update', () => {
    const putRoute = router.stack.find(
      (layer) => layer.route?.path === '/:id' && layer.route?.methods?.put,
    );
    expect(putRoute).toBeDefined();
  });

  it('should have a DELETE /:id route for deletion', () => {
    const deleteRoute = router.stack.find(
      (layer) => layer.route?.path === '/:id' && layer.route?.methods?.delete,
    );
    expect(deleteRoute).toBeDefined();
  });
});
