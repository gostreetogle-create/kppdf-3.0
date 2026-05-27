import { TestBed } from '@angular/core/testing';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { authInterceptor } from './auth.interceptor';
import { credentialsInterceptor } from './credentials.interceptor';
import { environment } from '@env/environment';

const mockUser = {
  userId: '1',
  username: 'admin',
  role: 'admin',
  permissions: ['admin.*', 'office.products.view'],
};

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let routerSpy: jasmine.SpyObj<Router>;

  function createService(): void {
    TestBed.resetTestingModule();
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([credentialsInterceptor, authInterceptor])),
        provideHttpClientTesting(),
        AuthService,
        { provide: Router, useValue: routerSpy },
      ],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  }

  afterEach(() => {
    if (httpMock) {
      httpMock.verify();
    }
  });

  it('should be created', () => {
    createService();
    expect(service).toBeTruthy();
    expect(service.permissions()).toEqual([]);
  });

  describe('login', () => {
    beforeEach(() => createService());

    it('should POST credentials and store user profile in memory', () => {
      service.login({ username: 'admin', password: 'admin' }).subscribe((user) => {
        expect(user).toEqual(mockUser);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ username: 'admin', password: 'admin' });
      expect(req.request.withCredentials).toBeTrue();
      req.flush({ success: true, data: mockUser });

      expect(service.getUser()).toEqual(mockUser);
      expect(service.permissions()).toEqual(mockUser.permissions);
    });
  });

  describe('logout', () => {
    beforeEach(() => {
      createService();
      service.login({ username: 'admin', password: 'admin' }).subscribe();
      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      req.flush({ success: true, data: mockUser });
    });

    it('should clear session and navigate to login', () => {
      service.logout();
      expect(service.getUser()).toBeNull();
      expect(service.permissions()).toEqual([]);
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/logout`);
      expect(req.request.method).toBe('POST');
      req.flush({ success: true, data: null });
    });
  });

  describe('hasPermission', () => {
    it('should return false when no permissions', () => {
      createService();
      expect(service.hasPermission('anything')).toBeFalse();
    });

    it('should match exact permission after login', () => {
      createService();
      service.login({ username: 'admin', password: 'admin' }).subscribe();
      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      req.flush({ success: true, data: { ...mockUser, permissions: ['office.products.view'] } });

      expect(service.hasPermission('office.products.view')).toBeTrue();
      expect(service.hasPermission('office.products.edit')).toBeFalse();
    });

    it('should match wildcard * (super admin)', () => {
      createService();
      service.login({ username: 'admin', password: 'admin' }).subscribe();
      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      req.flush({ success: true, data: { ...mockUser, permissions: ['*'] } });
      expect(service.hasPermission('any.deep.nested.thing')).toBeTrue();
    });

    it('should match module wildcard (office.*)', () => {
      createService();
      service.login({ username: 'admin', password: 'admin' }).subscribe();
      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      req.flush({ success: true, data: { ...mockUser, permissions: ['office.*'] } });
      expect(service.hasPermission('office.products.view')).toBeTrue();
      expect(service.hasPermission('production.boms.view')).toBeFalse();
    });

    it('should match action wildcard (*.view)', () => {
      createService();
      service.login({ username: 'admin', password: 'admin' }).subscribe();
      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      req.flush({ success: true, data: { ...mockUser, permissions: ['*.view'] } });
      expect(service.hasPermission('office.products.view')).toBeTrue();
      expect(service.hasPermission('office.products.create')).toBeFalse();
    });
  });

  describe('isAuthenticated', () => {
    beforeEach(() => createService());

    it('should return true when user is loaded', () => {
      service.login({ username: 'admin', password: 'admin' }).subscribe();
      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      req.flush({ success: true, data: mockUser });
      expect(service.isAuthenticated()).toBeTrue();
    });

    it('should return false when no user', () => {
      expect(service.isAuthenticated()).toBeFalse();
    });
  });

  describe('refresh', () => {
    beforeEach(() => createService());

    it('should POST refresh and update user profile', () => {
      service.refresh().subscribe((user) => {
        expect(user?.username).toBe('admin');
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/refresh`);
      expect(req.request.method).toBe('POST');
      expect(req.request.withCredentials).toBeTrue();
      req.flush({ success: true, data: mockUser });

      expect(service.isAuthenticated()).toBeTrue();
    });
  });

  describe('initializeAuth', () => {
    beforeEach(() => createService());

    it('should load user via /me when session cookie is valid', async () => {
      const initPromise = service.initializeAuth();
      const meReq = httpMock.expectOne(`${environment.apiUrl}/auth/me`);
      meReq.flush({ success: true, data: mockUser });
      await initPromise;
      expect(service.isAuthenticated()).toBeTrue();
    });

    it('should try refresh when /me fails', async () => {
      const initPromise = service.initializeAuth();
      const meReq = httpMock.expectOne(`${environment.apiUrl}/auth/me`);
      meReq.error(new ProgressEvent('error'), { status: 401, statusText: 'Unauthorized' });
      await Promise.resolve();

      const refreshReq = httpMock.expectOne(`${environment.apiUrl}/auth/refresh`);
      refreshReq.flush({ success: true, data: mockUser });
      await initPromise;
      expect(service.isAuthenticated()).toBeTrue();
    });

    it('should clear session when /me and refresh fail', async () => {
      const initPromise = service.initializeAuth();
      const meReq = httpMock.expectOne(`${environment.apiUrl}/auth/me`);
      meReq.error(new ProgressEvent('error'), { status: 401, statusText: 'Unauthorized' });
      await Promise.resolve();

      const refreshReq = httpMock.expectOne(`${environment.apiUrl}/auth/refresh`);
      refreshReq.error(new ProgressEvent('error'), { status: 401, statusText: 'Unauthorized' });
      await initPromise;
      expect(service.isAuthenticated()).toBeFalse();
    });
  });

  describe('fetchMe', () => {
    beforeEach(() => createService());

    it('should GET /auth/me and set user', () => {
      service.fetchMe().subscribe((user) => {
        expect(user.username).toBe('admin');
      });
      const req = httpMock.expectOne(`${environment.apiUrl}/auth/me`);
      expect(req.request.method).toBe('GET');
      req.flush({ success: true, data: mockUser });
    });
  });
});
