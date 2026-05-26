import { TestBed } from '@angular/core/testing';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { authInterceptor } from './auth.interceptor';
import { environment } from '@env/environment';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let routerSpy: jasmine.SpyObj<Router>;

  /** Helper: пересоздать сервис с новым состоянием localStorage */
  function createService(): void {
    TestBed.resetTestingModule();
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        AuthService,
        { provide: Router, useValue: routerSpy },
      ],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  }

  afterEach(() => {
    localStorage.clear();
    if (httpMock) {
      httpMock.verify();
    }
  });

  // ================================================================
  //  Creation
  // ================================================================
  it('should be created', () => {
    createService();
    expect(service).toBeTruthy();
    expect(service.permissions()).toEqual([]);
  });

  // ================================================================
  //  login()
  // ================================================================
  describe('login', () => {
    beforeEach(() => createService());

    it('should POST credentials and save tokens to localStorage', () => {
      const tokens = { accessToken: 'acc-123', refreshToken: 'ref-456' };

      service.login({ username: 'admin', password: 'admin' }).subscribe((result) => {
        expect(result).toEqual(tokens);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ username: 'admin', password: 'admin' });
      req.flush({ success: true, data: tokens });

      expect(localStorage.getItem('kppdf_access_token')).toBe('acc-123');
      expect(localStorage.getItem('kppdf_refresh_token')).toBe('ref-456');
    });

    it('should decode JWT payload and save user info', () => {
      // JWT with payload: { userId: "1", username: "admin", role: "admin", permissions: ["admin.*"] }
      const fakePayload = btoa(JSON.stringify({
        userId: '1',
        username: 'admin',
        role: 'admin',
        permissions: ['admin.*', 'office.products.view'],
      }));
      const tokens = { accessToken: `header.${fakePayload}.sig`, refreshToken: 'ref' };

      service.login({ username: 'admin', password: 'admin' }).subscribe();
      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      req.flush({ success: true, data: tokens });

      const user = service.getUser();
      expect(user?.userId).toBe('1');
      expect(user?.username).toBe('admin');
      expect(user?.role).toBe('admin');
      expect(service.permissions()).toEqual(['admin.*', 'office.products.view']);
    });
  });

  // ================================================================
  //  logout()
  // ================================================================
  describe('logout', () => {
    beforeEach(() => {
      createService();
      localStorage.setItem('kppdf_access_token', 'token');
      localStorage.setItem('kppdf_refresh_token', 'refresh');
      localStorage.setItem('kppdf_user', '{"userId":"1","username":"admin","role":"admin"}');
      localStorage.setItem('kppdf_permissions', '["admin.*"]');
    });

    it('should clear all auth data from localStorage', () => {
      service.logout();
      expect(localStorage.getItem('kppdf_access_token')).toBeNull();
      expect(localStorage.getItem('kppdf_refresh_token')).toBeNull();
      expect(localStorage.getItem('kppdf_user')).toBeNull();
      expect(localStorage.getItem('kppdf_permissions')).toBeNull();
    });

    it('should clear permissions signal', () => {
      service.logout();
      expect(service.permissions()).toEqual([]);
    });

    it('should navigate to /login', () => {
      service.logout();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
    });
  });

  // ================================================================
  //  hasPermission() — wildcard matching
  // ================================================================
  describe('hasPermission', () => {
    it('should return false when no permissions', () => {
      createService();
      expect(service.hasPermission('anything')).toBeFalse();
    });

    it('should match exact permission', () => {
      localStorage.setItem('kppdf_permissions', JSON.stringify(['office.products.view']));
      createService();
      expect(service.hasPermission('office.products.view')).toBeTrue();
      expect(service.hasPermission('office.products.edit')).toBeFalse();
    });

    it('should match wildcard * (super admin)', () => {
      localStorage.setItem('kppdf_permissions', JSON.stringify(['*']));
      createService();
      expect(service.hasPermission('any.deep.nested.thing')).toBeTrue();
    });

    it('should match module wildcard (office.*)', () => {
      localStorage.setItem('kppdf_permissions', JSON.stringify(['office.*']));
      createService();
      expect(service.hasPermission('office.products.view')).toBeTrue();
      expect(service.hasPermission('office.tenders.create')).toBeTrue();
      expect(service.hasPermission('production.boms.view')).toBeFalse();
    });

    it('should match action wildcard (*.view)', () => {
      localStorage.setItem('kppdf_permissions', JSON.stringify(['*.view']));
      createService();
      expect(service.hasPermission('office.products.view')).toBeTrue();
      expect(service.hasPermission('production.boms.view')).toBeTrue();
      expect(service.hasPermission('office.products.create')).toBeFalse();
    });
  });

  // ================================================================
  //  isAuthenticated()
  // ================================================================
  describe('isAuthenticated', () => {
    beforeEach(() => createService());

    it('should return true when access token exists', () => {
      localStorage.setItem('kppdf_access_token', 'some-token');
      expect(service.isAuthenticated()).toBeTrue();
    });

    it('should return false when no access token', () => {
      expect(service.isAuthenticated()).toBeFalse();
    });
  });

  // ================================================================
  //  refresh()
  // ================================================================
  describe('refresh', () => {
    beforeEach(() => createService());

    it('should POST refreshToken and return new tokens', () => {
      localStorage.setItem('kppdf_refresh_token', 'old-refresh');

      service.refresh().subscribe((tokens) => {
        expect(tokens?.accessToken).toBe('new-acc');
        expect(tokens?.refreshToken).toBe('new-ref');
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/refresh`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ refreshToken: 'old-refresh' });
      req.flush({ success: true, data: { accessToken: 'new-acc', refreshToken: 'new-ref' } });

      expect(localStorage.getItem('kppdf_access_token')).toBe('new-acc');
    });

    it('should return null when no refresh token', () => {
      service.refresh().subscribe((result) => {
        expect(result).toBeNull();
      });
    });
  });

  // ================================================================
  //  initializeAuth()
  // ================================================================
  describe('initializeAuth', () => {
    beforeEach(() => createService());

    it('should do nothing if no access token', async () => {
      localStorage.removeItem('kppdf_access_token');
      await service.initializeAuth();
      expect(service.isAuthenticated()).toBeFalse();
    });

    it('should keep session if token is not expired', async () => {
      const future = Math.floor(Date.now() / 1000) + 3600; // +1 hour
      const payload = btoa(JSON.stringify({ userId: '1', exp: future }));
      localStorage.setItem('kppdf_access_token', `header.${payload}.sig`);
      localStorage.setItem('kppdf_refresh_token', 'refresh');

      await service.initializeAuth();
      expect(service.isAuthenticated()).toBeTrue();
    });

    it('should logout if token is malformed', async () => {
      localStorage.setItem('kppdf_access_token', 'not-a-valid-jwt');
      await service.initializeAuth();
      expect(service.isAuthenticated()).toBeFalse();
    });
  });

  // ================================================================
  //  getAccessToken / getRefreshToken
  // ================================================================
  describe('getAccessToken / getRefreshToken', () => {
    beforeEach(() => createService());

    it('should return tokens from localStorage', () => {
      localStorage.setItem('kppdf_access_token', 'acc');
      localStorage.setItem('kppdf_refresh_token', 'ref');
      expect(service.getAccessToken()).toBe('acc');
      expect(service.getRefreshToken()).toBe('ref');
    });

    it('should return null when no tokens', () => {
      expect(service.getAccessToken()).toBeNull();
      expect(service.getRefreshToken()).toBeNull();
    });
  });
});
