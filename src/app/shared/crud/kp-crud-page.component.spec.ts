import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeuix/themes/aura';
import { ConfirmationService, MessageService } from 'primeng/api';
import { signal, computed } from '@angular/core';
import { KpCrudPageComponent } from './kp-crud-page.component';
import { CrudStore } from '../services/crud-store.service';
import { AuthService } from '../../core/auth.service';
import type { KpColumn } from '../ui/kp-table.component';
import type { CrudPermissions } from './crud-page.types';

// ===== Mock CrudStore =====
function createMockStore(): CrudStore<object> {
  const store = jasmine.createSpyObj<CrudStore<object>>(
    'CrudStore',
    ['load', 'create', 'update', 'delete', 'setSearch', 'handlePageChange', 'handleSort'],
    {
      items: signal([]),
      total: signal(0),
      loading: signal(false),
      saving: signal(false),
      page: signal(1),
      limit: signal(15),
      search: signal(''),
      sortField: signal('createdAt'),
      sortOrder: signal(-1),
      error: signal(null),
      hasData: computed(() => false),
      isIdle: computed(() => true),
    },
  );
  return store;
}

// ===== Mock AuthService =====
function createMockAuth(): jasmine.SpyObj<AuthService> {
  return jasmine.createSpyObj('AuthService', ['hasPermission'], {
    permissions: signal([]),
  });
}

describe('KpCrudPageComponent', () => {
  let fixture: ComponentFixture<KpCrudPageComponent>;
  let component: KpCrudPageComponent;
  let mockStore: CrudStore<object>;
  let mockAuth: jasmine.SpyObj<AuthService>;

  const testColumns: KpColumn[] = [
    { field: 'name', header: 'Name', type: 'text' },
    { field: 'status', header: 'Status', type: 'tag' },
  ];

  const testPermissions: CrudPermissions = {
    view: 'test.view',
    create: 'test.create',
    edit: 'test.edit',
    delete: 'test.delete',
  };

  function configureTestBed(
    permissions: CrudPermissions | null = testPermissions,
    customAuth?: jasmine.SpyObj<AuthService>,
  ): void {
    mockStore = createMockStore();
    mockAuth = customAuth ?? createMockAuth();
    if (!customAuth) {
      mockAuth.hasPermission.and.returnValue(true);
    }

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [KpCrudPageComponent],
      providers: [
        provideHttpClient(),
        provideNoopAnimations(),
        providePrimeNG({ theme: { preset: Aura, options: { cssLayer: { name: 'primeng', order: 'primeng' } } } }),
        ConfirmationService,
        MessageService,
        { provide: AuthService, useValue: mockAuth },
      ],
    });

    fixture = TestBed.createComponent(KpCrudPageComponent);
    component = fixture.componentInstance;

    // Set inputs
    fixture.componentRef.setInput('title', 'Test Page');
    fixture.componentRef.setInput('store', mockStore);
    fixture.componentRef.setInput('columns', testColumns);
    fixture.componentRef.setInput('permissions', permissions);

    fixture.detectChanges();
  }

  // ================================================================
  //  Basic creation
  // ================================================================
  it('should create the component', () => {
    configureTestBed();
    expect(component).toBeTruthy();
  });

  it('should load data on init', () => {
    configureTestBed();
    expect(mockStore.load).toHaveBeenCalled();
  });

  // ================================================================
  //  Inputs
  // ================================================================
  it('should accept title input', () => {
    configureTestBed();
    expect(component.title()).toBe('Test Page');
  });

  it('should accept description input', () => {
    configureTestBed();
    fixture.componentRef.setInput('description', 'A test page description');
    fixture.detectChanges();
    expect(component.description()).toBe('A test page description');
  });

  it('should accept store input', () => {
    configureTestBed();
    expect(component.store()).toBe(mockStore);
  });

  it('should accept columns input', () => {
    configureTestBed();
    expect(component.columns()).toEqual(testColumns);
  });

  // ================================================================
  //  canCreate
  // ================================================================
  it('canCreate should be true when no permissions set', () => {
    configureTestBed(null);
    expect(component.canCreate()).toBeTrue();
  });

  it('canCreate should check AuthService when permissions have create', () => {
    configureTestBed();
    expect(component.canCreate()).toBeTrue();
    expect(mockAuth.hasPermission).toHaveBeenCalledWith('test.create');
  });

  it('canCreate should be false when permission is denied', () => {
    const deniedAuth = createMockAuth();
    deniedAuth.hasPermission.and.returnValue(false);
    configureTestBed(testPermissions, deniedAuth);
    expect(component.canCreate()).toBeFalse();
  });

  // ================================================================
  //  showRowActions
  // ================================================================
  it('showRowActions should be true when permissions have update or delete', () => {
    configureTestBed();
    expect(component.showRowActions()).toBeTrue();
  });

  it('showRowActions should be true when extraRowActions exist', () => {
    configureTestBed(null);
    expect(component.showRowActions()).toBeFalse();

    fixture.componentRef.setInput('extraRowActions', [
      { id: 'custom', label: 'Custom', handler: () => { /**/ } },
    ]);
    fixture.detectChanges();
    expect(component.showRowActions()).toBeTrue();
  });

  // ================================================================
  //  Dialog — openCreate
  // ================================================================
  describe('openCreate', () => {
    beforeEach(() => configureTestBed());

    it('should set editing=false and clear editingId', () => {
      component.openCreate();
      expect(component.editing()).toBeFalse();
      expect(component.editingId()).toBeNull();
    });

    it('should open dialog with "Создание" title', () => {
      component.openCreate();
      expect(component.dialogVisible()).toBeTrue();
      expect(component.dialogTitle()).toContain('Создание');
    });

    it('should reset editRow to empty', () => {
      component.editRow.set({ name: 'old' });
      component.openCreate();
      expect(component.editRow()).toEqual({});
    });
  });

  // ================================================================
  //  Dialog — openEdit
  // ================================================================
  describe('openEdit', () => {
    beforeEach(() => configureTestBed());

    it('should set editing=true and store id', () => {
      component.openEdit({ _id: '123', name: 'Test' });
      expect(component.editing()).toBeTrue();
      expect(component.editingId()).toBe('123');
    });

    it('should open dialog with "Редактирование" title', () => {
      component.openEdit({ _id: '123', name: 'Test' });
      expect(component.dialogVisible()).toBeTrue();
      expect(component.dialogTitle()).toContain('Редактирование');
    });

    it('should strip _id from editRow to avoid updating the primary key', () => {
      component.openEdit({ _id: '123', name: 'Test', status: 'active' });
      expect(component.editRow()).toEqual({ name: 'Test', status: 'active' });
      expect(component.editRow()['_id']).toBeUndefined();
    });
  });

  // ================================================================
  //  Dialog — closeDialog
  // ================================================================
  describe('closeDialog', () => {
    beforeEach(() => configureTestBed());

    it('should close dialog and reset state', () => {
      component.openCreate();
      component.closeDialog();

      expect(component.dialogVisible()).toBeFalse();
      expect(component.editRow()).toEqual({});
      expect(component.editingId()).toBeNull();
      expect(component.editing()).toBeFalse();
    });
  });

  // ================================================================
  //  confirmDelete
  // ================================================================
  describe('confirmDelete', () => {
    beforeEach(() => configureTestBed());

    it('should call ConfirmationService.confirm', () => {
      const confirmSpy = spyOn(TestBed.inject(ConfirmationService), 'confirm');
      component.confirmDelete({ _id: '123', name: 'Test Item' });

      expect(confirmSpy).toHaveBeenCalledWith(jasmine.objectContaining({
        header: 'Подтверждение удаления',
        acceptLabel: 'Удалить',
      }));
    });
  });

  // ================================================================
  //  save()
  // ================================================================
  describe('save', () => {
    beforeEach(() => configureTestBed());

    it('should call store.create when not editing', async () => {
      (mockStore.create as jasmine.Spy).and.returnValue(Promise.resolve({ _id: 'new', name: 'X' }));
      component.openCreate();
      component.editRow.set({ name: 'New Item' });

      await component.save();

      expect(mockStore.create).toHaveBeenCalledWith({ name: 'New Item' });
    });

    it('should call store.update when editing', async () => {
      (mockStore.update as jasmine.Spy).and.returnValue(Promise.resolve({ _id: '1', name: 'Updated' }));
      component.openEdit({ _id: '1', name: 'Old' });
      component.editRow.set({ name: 'Updated' });

      await component.save();

      expect(mockStore.update).toHaveBeenCalledWith('1', { name: 'Updated' });
    });

    it('should close dialog on success', async () => {
      (mockStore.create as jasmine.Spy).and.returnValue(Promise.resolve({ _id: 'new', name: 'X' }));
      component.openCreate();

      await component.save();

      expect(component.dialogVisible()).toBeFalse();
    });

    it('should NOT close dialog on null result (error)', async () => {
      (mockStore.create as jasmine.Spy).and.returnValue(Promise.resolve(null));
      component.openCreate();

      await component.save();

      expect(component.dialogVisible()).toBeTrue();
    });
  });
});
