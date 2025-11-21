import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { LoginRequest, LoginResponse, User } from '../models';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AuthService],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);

    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('login', () => {
    it('should login successfully and store token', () => {
      const mockResponse: LoginResponse = {
        token: 'test-token-123',
        user: {
          id: 1,
          username: 'testuser',
          first_name: 'Test',
          last_name: 'User',
          is_staff: false,
          perspective_curator_for: [],
        },
      };

      service.login('testuser', 'password').subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(service.getToken()).toBe('test-token-123');
      });

      const req = httpMock.expectOne('http://localhost:8000/api/auth/login/');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ username: 'testuser', password: 'password' });
      req.flush(mockResponse);
    });

    it('should clear token on login failure', () => {
      // Set a token first
      service.setToken('existing-token');

      service.login('testuser', 'wrongpassword').subscribe({
        next: () => fail('Should have failed'),
        error: error => {
          expect(error.status).toBe(401);
          expect(service.getToken()).toBeNull();
        },
      });

      const req = httpMock.expectOne('http://localhost:8000/api/auth/login/');
      req.flush({ detail: 'Invalid credentials' }, { status: 401, statusText: 'Unauthorized' });
    });
  });

  describe('logout', () => {
    it('should logout successfully and clear token', () => {
      // Set a token first
      service.setToken('test-token');

      service.logout().subscribe(response => {
        expect(service.getToken()).toBeNull();
      });

      const req = httpMock.expectOne('http://localhost:8000/api/auth/logout/');
      expect(req.request.method).toBe('POST');
      req.flush({});
    });
  });

  describe('getCurrentUser', () => {
    it('should get current user successfully', () => {
      const mockUser: User = {
        id: 1,
        username: 'testuser',
        first_name: 'Test',
        last_name: 'User',
        is_staff: false,
        perspective_curator_for: [],
      };

      service.getCurrentUser().subscribe(user => {
        expect(user).toEqual(mockUser);
      });

      const req = httpMock.expectOne('http://localhost:8000/api/auth/me/');
      expect(req.request.method).toBe('GET');
      req.flush(mockUser);
    });
  });

  describe('token management', () => {
    it('should set and get token', () => {
      expect(service.getToken()).toBeNull();

      service.setToken('test-token');
      expect(service.getToken()).toBe('test-token');
    });

    it('should clear token', () => {
      service.setToken('test-token');
      expect(service.getToken()).toBe('test-token');

      service.clearToken();
      expect(service.getToken()).toBeNull();
    });

    it('should trim token whitespace', () => {
      service.setToken('  test-token  ');
      expect(service.getToken()).toBe('test-token');
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when token exists', () => {
      service.setToken('test-token');
      expect(service.isAuthenticated()).toBe(true);
    });

    it('should return false when no token', () => {
      expect(service.isAuthenticated()).toBe(false);
    });
  });

  describe('getTestUsers', () => {
    it('should return flattened user list from paginated response', () => {
      const mockUsers: User[] = [
        {
          id: 1,
          username: 'testuser',
          first_name: 'Test',
          last_name: 'User',
          is_staff: false,
          perspective_curator_for: [],
          is_test_user: true,
        },
      ];

      service.getTestUsers().subscribe(users => {
        expect(users).toEqual(mockUsers);
      });

      const req = httpMock.expectOne('http://localhost:8000/api/users/?test_users_only=true');
      expect(req.request.method).toBe('GET');
      req.flush({
        count: mockUsers.length,
        next: null,
        previous: null,
        results: mockUsers,
      });
    });

    it('should return empty array when API omits results', () => {
      service.getTestUsers().subscribe(users => {
        expect(users).toEqual([]);
      });

      const req = httpMock.expectOne('http://localhost:8000/api/users/?test_users_only=true');
      req.flush({
        count: 0,
        next: null,
        previous: null,
        results: null,
      });
    });
  });
});
