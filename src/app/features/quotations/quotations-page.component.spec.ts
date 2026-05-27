import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeuix/themes/aura';
import { ConfirmationService, MessageService } from 'primeng/api';
import { AuthService } from '../../core/auth.service';
import { NotificationService } from '../../core/notification.service';
import { QuotationsPageComponent } from './quotations-page.component';
import { PERMISSIONS } from '../../core/permissions';

describe('QuotationsPageComponent', () => {
  let fixture: ComponentFixture<QuotationsPageComponent>;
  let component: QuotationsPageComponent;

  beforeEach(async () => {
    const mockAuth = jasmine.createSpyObj('AuthService', ['hasPermission'], {
      permissions: [],
    });
    mockAuth.hasPermission.and.returnValue(true);

    await TestBed.configureTestingModule({
      imports: [QuotationsPageComponent],
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

    fixture = TestBed.createComponent(QuotationsPageComponent);
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
  it('should define quotation columns', () => {
    expect(component.columns().length).toBeGreaterThan(0);
    const fields = component.columns().map((c) => c.field);
    expect(fields).toContain('number');
    expect(fields).toContain('counterpartyId');
    expect(fields).toContain('statusId');
    expect(fields).toContain('total');
  });

  // ================================================================
  //  Permissions
  // ================================================================
  it('should expose PERMISSIONS.quotations', () => {
    expect(component.PERMISSIONS).toBeTruthy();
    expect(component.PERMISSIONS.quotations).toBeDefined();
    expect(component.PERMISSIONS.quotations.view).toBe('office.quotations.view');
    expect(component.PERMISSIONS.quotations.create).toBe('office.quotations.create');
    expect(component.PERMISSIONS.quotations.edit).toBe('office.quotations.edit');
  });

  // ================================================================
  //  Compose action (QuotationEditor route)
  // ================================================================
  it('should have a compose row action with correct permission', () => {
    expect(component.rowActions.length).toBeGreaterThanOrEqual(1);
    const composeAction = component.rowActions.find((a) => a.id === 'compose');
    expect(composeAction).toBeDefined();
    expect(composeAction!.label).toBe('Оформить документ');
    expect(composeAction!.icon).toBe('pi pi-file-edit');
    expect(composeAction!.permission).toBe(PERMISSIONS.quotations.edit);
  });

  it('should have createRoute set to /quotations/new', () => {
    // The template has createRoute="/quotations/new"
    const hostElem: HTMLElement = fixture.nativeElement;
    expect(hostElem.querySelector('app-kp-crud-page')).toBeTruthy();
    // Check the template string includes the route
    expect(fixture.debugElement.nativeElement.innerHTML).toContain('/quotations/new');
  });

  // ================================================================
  //  Severity function
  // ================================================================
  it('should return correct severity for statuses', () => {
    expect(component.quotationSeverity('draft')).toBe('warn');
    expect(component.quotationSeverity('sent')).toBe('info');
    expect(component.quotationSeverity('accepted')).toBe('success');
    expect(component.quotationSeverity('confirmed')).toBe('success');
    expect(component.quotationSeverity('rejected')).toBe('danger');
    expect(component.quotationSeverity('expired')).toBe('secondary');
    expect(component.quotationSeverity('unknown')).toBe('info');
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
    expect(hostElem.textContent).toContain('Коммерческие предложения');
  });
});
