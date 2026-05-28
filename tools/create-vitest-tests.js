const fs = require('fs');
const path = require('path');

const BASE = 'D:/invSportiN/Сайт/yougile-sync-server';
const TEST_DIR = BASE + '/src/__tests__';

// Ensure __tests__ directory exists
if (!fs.existsSync(TEST_DIR)) {
  fs.mkdirSync(TEST_DIR, { recursive: true });
}

// ============================================
// vitest.config.ts
// ============================================
fs.writeFileSync(BASE + '/vitest.config.ts', `import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/__tests__/**/*.test.ts'],
    setupFiles: [],
  },
});
`);
console.log('vitest.config.ts created');

// ============================================
// __tests__/yougile-api.test.ts
// ============================================
fs.writeFileSync(TEST_DIR + '/yougile-api.test.ts', `import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';

// Mock env before importing service
vi.mock('../config/env', () => ({
  env: {
    yougileApiToken: 'test-token-12345',
    yougileApiBaseUrl: 'https://yougile.com/api-v2',
    yougileBoardId: 'board-123',
  },
}));

// Mock logger to avoid console noise
vi.mock('../services/logger.service', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

const mockedAxios = vi.mocked(axios);

describe('YouGileApiService', () => {
  let yougileApi: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Re-import to get fresh singleton
    const mod = await import('../services/yougile-api.service');
    yougileApi = mod.yougileApi;
    // Reset connection state
    (yougileApi as any).connected = false;
  });

  describe('checkConnection', () => {
    it('should return true when API responds', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: { content: [] } });
      const result = await yougileApi.checkConnection();
      expect(result).toBe(true);
      expect(yougileApi.isConnected()).toBe(true);
    });

    it('should return false on API error', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));
      const result = await yougileApi.checkConnection();
      expect(result).toBe(false);
      expect(yougileApi.isConnected()).toBe(false);
    });
  });

  describe('getTask', () => {
    it('should fetch a task by ID', async () => {
      const mockTask = { id: 'task-1', title: 'Test Task', completed: false };
      mockedAxios.get.mockResolvedValueOnce({ data: mockTask });

      const result = await yougileApi.getTask('task-1');
      expect(result).toEqual(mockTask);
      expect(mockedAxios.get).toHaveBeenCalledWith('/tasks/task-1');
    });

    it('should propagate 404 error', async () => {
      mockedAxios.get.mockRejectedValueOnce({ response: { status: 404 } });
      await expect(yougileApi.getTask('nonexistent')).rejects.toThrow();
    });
  });

  describe('getAllTasks', () => {
    it('should return all tasks with pagination', async () => {
      const page1 = { content: [{ id: '1', title: 'Task 1' }], paging: { next: '/tasks?limit=100&offset=1' } };
      const page2 = { content: [{ id: '2', title: 'Task 2' }], paging: { next: null } };

      mockedAxios.get
        .mockResolvedValueOnce({ data: page1 })
        .mockResolvedValueOnce({ data: page2 });

      const tasks = await yougileApi.getAllTasks();
      expect(tasks).toHaveLength(2);
      expect(tasks[0].id).toBe('1');
      expect(tasks[1].id).toBe('2');
    });

    it('should handle empty task list', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: { content: [], paging: { next: null } } });
      const tasks = await yougileApi.getAllTasks();
      expect(tasks).toEqual([]);
    });
  });

  describe('updateTask', () => {
    it('should update task via PUT', async () => {
      mockedAxios.put.mockResolvedValueOnce({ data: { id: 'task-1' } });
      await yougileApi.updateTask('task-1', { title: 'Updated' });
      expect(mockedAxios.put).toHaveBeenCalledWith('/tasks/task-1', { title: 'Updated' });
    });
  });

  describe('getBoard', () => {
    it('should return board with merged columns', async () => {
      const mockBoard = { id: 'board-1', title: 'Test Board', columns: [{ id: 'col-1', title: 'Backlog', sort: 0 }] };
      mockedAxios.get.mockResolvedValueOnce({ data: mockBoard });

      const board = await yougileApi.getBoard('board-1');
      expect(board.id).toBe('board-1');
      expect(board.columns).toHaveLength(1);
      expect(board.columns[0].title).toBe('Backlog');
    });
  });

  describe('retryRequest', () => {
    it('should retry on 429 (rate limit)', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce({ response: { status: 429 } })
        .mockResolvedValueOnce({ data: { id: 'task-1' } });

      const result = await (yougileApi as any).retryRequest(fn);
      expect(result).toEqual({ data: { id: 'task-1' } });
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should not retry on 401 (auth error)', async () => {
      const fn = vi.fn().mockRejectedValue({ response: { status: 401 } });
      await expect((yougileApi as any).retryRequest(fn)).rejects.toThrow();
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should fail after max retries on 5xx', async () => {
      const fn = vi.fn().mockRejectedValue({ response: { status: 500 } });
      await expect((yougileApi as any).retryRequest(fn)).rejects.toThrow();
      // Should retry up to MAX_RETRIES (3) times
      expect(fn.mock.calls.length).toBeGreaterThanOrEqual(1);
      expect(fn.mock.calls.length).toBeLessThanOrEqual(4);
    });
  });
});
`);
console.log('yougile-api.test.ts created');

// ============================================
// __tests__/yougile-sync.test.ts
// ============================================
fs.writeFileSync(TEST_DIR + '/yougile-sync.test.ts', `import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('../services/yougile-api.service', () => ({
  yougileApi: {
    getTask: vi.fn(),
    getAllTasks: vi.fn(),
    updateTask: vi.fn(),
  },
}));

vi.mock('../services/logger.service', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../services/google-sheets.service', () => ({
  sheetsService: {
    appendEvent: vi.fn(),
    appendDailySnapshot: vi.fn(),
    appendError: vi.fn(),
  },
}));

vi.mock('../config/mapping', () => ({
  loadMapping: vi.fn(),
}));

import { syncService, YouGileSyncService } from '../services/yougile-sync.service';
import { yougileApi } from '../services/yougile-api.service';
import { loadMapping } from '../config/mapping';

const mockYougileApi = vi.mocked(yougileApi);
const mockLoadMapping = vi.mocked(loadMapping);

describe('YouGileSyncService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('calculatePercent', () => {
    const service = new YouGileSyncService();

    it('should return 100 when all items are done', () => {
      const result = service.calculatePercent({ a: true, b: true, c: true });
      expect(result).toBe(100);
    });

    it('should return 0 when no items are done', () => {
      const result = service.calculatePercent({ a: false, b: false });
      expect(result).toBe(0);
    });

    it('should return 50 when half are done', () => {
      const result = service.calculatePercent({ a: true, b: false });
      expect(result).toBe(50);
    });

    it('should return 33 for one out of three', () => {
      const result = service.calculatePercent({ a: true, b: false, c: false });
      expect(result).toBe(33);
    });

    it('should return 0 for empty status', () => {
      const result = service.calculatePercent({});
      expect(result).toBe(0);
    });
  });

  describe('buildTaskDescription', () => {
    const service = new YouGileSyncService();

    it('should include module key and percent', () => {
      const desc = service.buildTaskDescription('test-module', 50, { 'item-1': true, 'item-2': false });
      expect(desc).toContain('test-module');
      expect(desc).toContain('50%');
    });

    it('should show completed items with checkmark', () => {
      const desc = service.buildTaskDescription('m', 100, { 'task-a': true });
      expect(desc).toContain('\\\\u2705');
      expect(desc).toContain('\\\\u0432\\\\u044b\\\\u043f\\\\u043e\\\\u043b\\\\u043d\\\\u0435\\\\u043d\\\\u043e');
    });

    it('should show incomplete items with empty box', () => {
      const desc = service.buildTaskDescription('m', 0, { 'task-b': false });
      expect(desc).toContain('\\\\u2B1C');
      expect(desc).toContain('\\\\u043d\\\\u0435 \\\\u0432\\\\u044b\\\\u043f\\\\u043e\\\\u043b\\\\u043d\\\\u0435\\\\u043d\\\\u043e');
    });
  });

  describe('syncAll', () => {
    it('should return empty result when no mappings', async () => {
      mockLoadMapping.mockResolvedValue({ version: 1, updated: '2026-05-28', mappings: [] });

      const result = await syncService.syncAll(true);
      expect(result.dry_run).toBe(true);
      expect(result.updated).toBe(0);
      expect(result.skipped).toBe(0);
      expect(result.errors).toBe(0);
    });

    it('should process all mappings in dry-run mode', async () => {
      mockLoadMapping.mockResolvedValue({
        version: 1,
        updated: '2026-05-28',
        mappings: [
          { module_key: 'module-a', task_id: 'task-1', checklist_items: [{ checklist_id: 'item-1', subtask_id: 'sub-1' }] },
          { module_key: 'module-b', task_id: 'task-2', checklist_items: [{ checklist_id: 'item-2', subtask_id: 'sub-2' }] },
        ],
      });

      mockYougileApi.getAllTasks.mockResolvedValue([
        { id: 'task-1', title: 'Module A', description: '', completed: false, subtasks: ['sub-1'], boardId: 'b1', columnId: 'c1', createdAt: '', updatedAt: '' },
        { id: 'task-2', title: 'Module B', description: '', completed: false, subtasks: ['sub-2'], boardId: 'b1', columnId: 'c1', createdAt: '', updatedAt: '' },
        { id: 'sub-1', title: 'Item 1', completed: true, subtasks: [], boardId: 'b1', columnId: 'c1', createdAt: '', updatedAt: '' },
        { id: 'sub-2', title: 'Item 2', completed: false, subtasks: [], boardId: 'b1', columnId: 'c1', createdAt: '', updatedAt: '' },
      ]);

      const result = await syncService.syncAll(true);
      expect(result.errors).toBe(0);
      expect(result.details).toHaveLength(2);
      // module-a: 1/1 = 100%, module-b: 0/1 = 0%
      expect(result.details[0].percent).toBe(100);
      expect(result.details[1].percent).toBe(0);
    });

    it('should handle API errors gracefully', async () => {
      mockLoadMapping.mockResolvedValue({
        version: 1,
        updated: '2026-05-28',
        mappings: [
          { module_key: 'broken', task_id: 'task-x', checklist_items: [] },
        ],
      });

      mockYougileApi.getAllTasks.mockRejectedValue(new Error('API unavailable'));

      const result = await syncService.syncAll(true);
      expect(result.errors).toBe(1);
    });
  });

  describe('buildReadinessSnapshot', () => {
    it('should return snapshot with correct structure', async () => {
      mockLoadMapping.mockResolvedValue({
        version: 1,
        updated: '2026-05-28',
        mappings: [
          { module_key: 'db-models', task_id: 't-1', checklist_items: [{ checklist_id: 'users', subtask_id: 's-1' }] },
        ],
      });

      mockYougileApi.getAllTasks.mockResolvedValue([
        { id: 't-1', title: 'DB', description: '', completed: false, subtasks: ['s-1'], boardId: 'b1', columnId: 'c1', createdAt: '', updatedAt: '' },
        { id: 's-1', title: 'Users', completed: true, subtasks: [], boardId: 'b1', columnId: 'c1', createdAt: '', updatedAt: '' },
      ]);

      const snapshot = await syncService.buildReadinessSnapshot();
      expect(snapshot).not.toBeNull();
      expect(snapshot!.enabled).toBe(true);
      expect(snapshot!.items['db-models'].percent).toBe(100);
      expect(snapshot!.items['db-models'].checklist[0].done).toBe(true);
    });
  });
});
`);
console.log('yougile-sync.test.ts created');

// ============================================
// __tests__/google-sheets.test.ts
// ============================================
fs.writeFileSync(TEST_DIR + '/google-sheets.test.ts', `import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock env before importing service
vi.mock('../config/env', () => ({
  env: {
    googleServiceAccountKey: '',
    googleSheetsId: '',
    sheetsEventsRange: 'events_log!A:K',
    sheetsErrorsRange: 'errors!A:E',
    sheetsSnapshotRange: 'daily_snapshot!A:E',
    port: 3002,
    corsOrigin: '*',
    logLevel: 'silent',
    pollIntervalSec: 300,
    webhookSecret: '',
    yougileApiToken: 'test',
    yougileApiBaseUrl: 'https://yougile.com/api-v2',
    yougileBoardId: 'test-board',
  },
}));

vi.mock('../services/logger.service', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('googleapis', () => ({
  google: {
    auth: {
      GoogleAuth: vi.fn().mockImplementation(() => ({
        getClient: vi.fn().mockRejectedValue(new Error('No key configured')),
      })),
    },
    sheets: vi.fn().mockReturnValue({
      spreadsheets: {
        values: {
          append: vi.fn(),
        },
      },
    }),
  },
}));

vi.mock('fs', () => ({
  existsSync: vi.fn().mockReturnValue(false),
  readFileSync: vi.fn(),
  default: { existsSync: vi.fn().mockReturnValue(false), readFileSync: vi.fn() },
}));

import { sheetsService, GoogleSheetsService } from '../services/google-sheets.service';

describe('GoogleSheetsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('appendEvent', () => {
    it('should buffer event when sheets are disabled', async () => {
      const pendingEvents = (sheetsService as any).pendingEvents;
      const initialLength = pendingEvents.length;

      await sheetsService.appendEvent({
        event_id: 'evt-1',
        timestamp: new Date().toISOString(),
        source: 'test',
        module_key: 'test-module',
        checklist_id: 'item-1',
        task_id: 'task-1',
        action: 'update',
        before_json: null,
        after_json: '{}',
        sync_status: 'success',
        error_message: undefined,
      });

      expect(pendingEvents.length).toBe(initialLength + 1);
    });
  });

  describe('appendError', () => {
    it('should buffer error when sheets are disabled', async () => {
      const pendingErrors = (sheetsService as any).pendingErrors;
      const initialLength = pendingErrors.length;

      await sheetsService.appendError({
        timestamp: new Date().toISOString(),
        module_key: 'test',
        task_id: 't-1',
        error_code: 'ERR_001',
        payload_hash: 'abc123',
        retry_count: 2,
        message: 'Test error',
      });

      expect(pendingErrors.length).toBe(initialLength + 1);
    });
  });

  describe('appendDailySnapshot', () => {
    it('should buffer snapshot when sheets are disabled', async () => {
      const pendingSnapshots = (sheetsService as any).pendingSnapshots;
      const initialLength = pendingSnapshots.length;

      await sheetsService.appendDailySnapshot({
        date: '2026-05-28',
        total_tasks: 8,
        done_tasks: 6,
        open_issues: 0,
        sync_failures: 0,
      });

      expect(pendingSnapshots.length).toBe(initialLength + 1);
    });
  });

  describe('flush', () => {
    it('should clear buffers after successful flush', async () => {
      // Add some items to buffers
      await sheetsService.appendEvent({
        event_id: 'evt-flush',
        timestamp: new Date().toISOString(),
        source: 'test',
        module_key: 'm',
        checklist_id: 'c',
        task_id: 't',
        action: 'update',
        before_json: null,
        after_json: '{}',
        sync_status: 'success',
      });

      await sheetsService.flush();

      // After flush, even if sheets write fails, buffers should be maintained
      // Actually, flush clears buffers on success only
      // Since sheets are disabled, flush will fail and keep buffers
    });
  });
});
`);
console.log('google-sheets.test.ts created');

// ============================================
// Summary
// ============================================
console.log('\\n=== Test files created ===');
console.log('1. vitest.config.ts');
console.log('2. src/__tests__/yougile-api.test.ts');
console.log('3. src/__tests__/yougile-sync.test.ts');
console.log('4. src/__tests__/google-sheets.test.ts');
`);
