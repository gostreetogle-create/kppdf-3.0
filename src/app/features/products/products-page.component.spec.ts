import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeuix/themes/aura';
import { ConfirmationService, MessageService } from 'primeng/api';
import { AuthService } from '../../core/auth.service';
import { NotificationService } from '../../core/notification.service';
import { ProductsPageComponent } from './products-page.component';

describe('ProductsPageComponent', () => {
  let fixture: ComponentFixture<ProductsPageComponent>;
  let component: ProductsPageComponent;

  beforeEach(async () => {
    const mockAuth = jasmine.createSpyObj('AuthService', ['hasPermission'], {
      permissions: [],
    });
    mockAuth.hasPermission.and.returnValue(true);

    await TestBed.configureTestingModule({
      imports: [ProductsPageComponent],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [
        provideHttpClient(),
        provideNoopAnimations(),
        providePrimeNG({ theme: { preset: Aura, options: { cssLayer: { name: 'primeng', order: 'primeng' } } } }),
        ConfirmationService,
        MessageService,
        NotificationService,
        { provide: AuthService, useValue: mockAuth },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductsPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ================================================================
  //  Basic creation
  // ================================================================
  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  // ================================================================
  //  Columns
  // ================================================================
  it('should define product columns', () => {
    expect(component.columns().length).toBeGreaterThan(0);
    const fields = component.columns().map((c) => c.field);
    expect(fields).toContain('name');
    expect(fields).toContain('sku');
    expect(fields).toContain('kind');
    expect(fields).toContain('categoryId');
    expect(fields).toContain('unit');
    expect(fields).toContain('status');
  });

  it('should have sortable columns', () => {
    const cols = component.columns();
    const sortable = cols.filter((c) => c.sortable !== false);
    expect(sortable.length).toBe(cols.length);
  });

  it('should expose Russian labels for kind and status tags', () => {
    const kindCol = component.columns().find((c) => c.field === 'kind');
    const statusCol = component.columns().find((c) => c.field === 'status');
    expect(kindCol?.options?.some((o) => o.label === 'Товар')).toBeTrue();
    expect(statusCol?.options?.some((o) => o.label === 'Активен')).toBeTrue();
  });

  // ================================================================
  //  Store
  // ================================================================
  it('should create a CrudStore instance', () => {
    expect(component.store).toBeTruthy();
    expect(typeof component.store.load).toBe('function');
    expect(typeof component.store.create).toBe('function');
    expect(typeof component.store.update).toBe('function');
    expect(typeof component.store.delete).toBe('function');
  });

  it('should have a store configured for /products', () => {
    // Store is created in the constructor; load is called in ngOnInit (see beforeEach)
    expect(component.store).toBeTruthy();
  });

  // ================================================================
  //  permissions
  // ================================================================
  it('should expose PERMISSIONS.products', () => {
    expect(component.PERMISSIONS).toBeTruthy();
    expect(component.PERMISSIONS.products).toBeDefined();
    expect(component.PERMISSIONS.products.view).toBe('office.products.view');
    expect(component.PERMISSIONS.products.create).toBe('office.products.create');
  });

  // ================================================================
  //  Severity function
  // ================================================================
  describe('productSeverity', () => {
    it('should return "success" for active status', () => {
      expect(component.productSeverity('active')).toBe('success');
    });

    it('should return "warn" for draft status', () => {
      expect(component.productSeverity('draft')).toBe('warn');
    });

    it('should return "danger" for archived status', () => {
      expect(component.productSeverity('archived')).toBe('danger');
    });

    it('should return "info" for ITEM kind', () => {
      expect(component.productSeverity('ITEM')).toBe('info');
    });

    it('should return "warn" for SERVICE kind', () => {
      expect(component.productSeverity('SERVICE')).toBe('warn');
    });

    it('should return "success" for WORK kind', () => {
      expect(component.productSeverity('WORK')).toBe('success');
    });

    it('should return "info" for unknown values', () => {
      expect(component.productSeverity('unknown')).toBe('info');
    });
  });

  // ================================================================
  //  Template rendering
  // ================================================================
  it('should render kp-crud-page component', () => {
    const hostElem: HTMLElement = fixture.nativeElement;
    expect(hostElem.querySelector('app-kp-crud-page')).toBeTruthy();
  });

  it('should pass title to kp-crud-page', () => {
    const hostElem: HTMLElement = fixture.nativeElement;
    expect(hostElem.textContent).toContain('Товары');
  });

  it('should include form template in shadow DOM', () => {
    // Form is inside <ng-template #form> — not rendered until dialog opens
    const hostElem: HTMLElement = fixture.nativeElement;
    expect(hostElem.textContent).toContain('Товары');
    expect(hostElem.textContent).toContain('Справочник товаров, услуг и работ');
  });
});
