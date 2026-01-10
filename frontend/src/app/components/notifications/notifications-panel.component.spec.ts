import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, NavigationEnd } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { NotificationsPanelComponent } from './notifications-panel.component';
import { NotificationApiService } from '../../services/notification-api.service';
import { AuthService } from '../../services/auth.service';
import { Notification } from '../../models';

describe('NotificationsPanelComponent', () => {
  let component: NotificationsPanelComponent;
  let fixture: ComponentFixture<NotificationsPanelComponent>;
  let notificationApiService: jasmine.SpyObj<NotificationApiService>;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;
  let routerEvents$: Subject<any>;
  let originalConsoleError: typeof console.error;

  beforeEach(async () => {
    // Suppress console.error during tests
    originalConsoleError = console.error;
    console.error = jasmine.createSpy('console.error');
    routerEvents$ = new Subject();
    const routerSpy = jasmine.createSpyObj('Router', ['navigate'], {
      events: routerEvents$.asObservable(),
    });
    const notificationApiSpy = jasmine.createSpyObj('NotificationApiService', [
      'getNotifications',
      'markAsRead',
      'markAllAsRead',
    ]);
    const authSpy = jasmine.createSpyObj('AuthService', ['isAuthenticated', 'isOktaCallback'], {
      isAuthenticated: jasmine.createSpy('isAuthenticated').and.returnValue(true),
      isOktaCallback: jasmine.createSpy('isOktaCallback').and.returnValue(false),
    });

    await TestBed.configureTestingModule({
      imports: [NotificationsPanelComponent],
      providers: [
        { provide: NotificationApiService, useValue: notificationApiSpy },
        { provide: AuthService, useValue: authSpy },
        { provide: Router, useValue: routerSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationsPanelComponent);
    component = fixture.componentInstance;
    notificationApiService = TestBed.inject(
      NotificationApiService
    ) as jasmine.SpyObj<NotificationApiService>;
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  afterEach(() => {
    // Restore console.error after each test
    console.error = originalConsoleError;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should load notifications if authenticated and not on callback', () => {
      const mockNotifications: Notification[] = [
        {
          id: 1,
          type: 'draft_approved',
          message: 'Test notification',
          is_read: false,
          created_at: '2023-01-01T00:00:00Z',
        },
      ];

      notificationApiService.getNotifications.and.returnValue(
        of({
          count: 1,
          next: null,
          previous: null,
          results: mockNotifications,
        })
      );

      fixture.detectChanges();

      expect(notificationApiService.getNotifications).toHaveBeenCalled();
      expect(component.notifications.length).toBe(1);
      expect(component.unreadCount).toBe(1);
    });

    it('should not load notifications if not authenticated', () => {
      authService.isAuthenticated.and.returnValue(false);

      fixture.detectChanges();

      expect(notificationApiService.getNotifications).not.toHaveBeenCalled();
    });

    it('should not load notifications if on Okta callback', () => {
      authService.isOktaCallback.and.returnValue(true);

      fixture.detectChanges();

      expect(notificationApiService.getNotifications).not.toHaveBeenCalled();
    });

    it('should refresh notifications on navigation end', () => {
      const mockNotifications: Notification[] = [
        {
          id: 1,
          type: 'draft_approved',
          message: 'Test notification',
          is_read: false,
          created_at: '2023-01-01T00:00:00Z',
        },
      ];

      notificationApiService.getNotifications.and.returnValue(
        of({
          count: 1,
          next: null,
          previous: null,
          results: mockNotifications,
        })
      );

      fixture.detectChanges();
      notificationApiService.getNotifications.calls.reset();

      // Simulate navigation end
      routerEvents$.next(new NavigationEnd(1, '/glossary', '/glossary'));

      // Should refresh when panel is closed
      expect(notificationApiService.getNotifications).toHaveBeenCalled();
    });
  });

  describe('togglePanel', () => {
    it('should toggle panel open state', () => {
      const mockResponse = {
        count: 0,
        next: null,
        previous: null,
        results: [],
      };
      notificationApiService.getNotifications.and.returnValue(of(mockResponse));

      expect(component.isOpen).toBe(false);

      component.togglePanel();
      expect(component.isOpen).toBe(true);

      component.togglePanel();
      expect(component.isOpen).toBe(false);
    });

    it('should load notifications when opening panel', () => {
      const mockNotifications: Notification[] = [
        {
          id: 1,
          type: 'draft_approved',
          message: 'Test notification',
          is_read: false,
          created_at: '2023-01-01T00:00:00Z',
        },
      ];

      const mockResponse = {
        count: 1,
        next: null,
        previous: null,
        results: mockNotifications,
      };

      notificationApiService.getNotifications.and.returnValue(of(mockResponse));

      component.togglePanel();

      expect(notificationApiService.getNotifications).toHaveBeenCalled();
      expect(component.notifications).toEqual(mockNotifications);
    });
  });

  describe('loadNotifications', () => {
    it('should load and display notifications', () => {
      const mockNotifications: Notification[] = [
        {
          id: 1,
          type: 'draft_approved',
          message: 'Unread notification',
          is_read: false,
          created_at: '2023-01-01T00:00:00Z',
        },
        {
          id: 2,
          type: 'draft_edited',
          message: 'Read notification',
          is_read: true,
          created_at: '2023-01-02T00:00:00Z',
        },
      ];

      notificationApiService.getNotifications.and.returnValue(
        of({
          count: 2,
          next: null,
          previous: null,
          results: mockNotifications,
        })
      );

      component.loadNotifications();

      expect(component.notifications).toEqual(mockNotifications);
      expect(component.unreadCount).toBe(1);
      expect(component.loading).toBe(false);
    });

    it('should handle loading state', () => {
      notificationApiService.getNotifications.and.returnValue(
        of({
          count: 0,
          next: null,
          previous: null,
          results: [],
        })
      );

      component.loadNotifications();

      expect(component.loading).toBe(false);
    });

    it('should handle errors when loading notifications', () => {
      notificationApiService.getNotifications.and.returnValue(
        throwError(() => ({ status: 500, message: 'Server error' }))
      );

      component.loadNotifications();

      expect(component.loading).toBe(false);
      expect(component.notifications.length).toBe(0);
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', () => {
      const notification: Notification = {
        id: 1,
        type: 'draft_approved',
        message: 'Test notification',
        is_read: false,
        created_at: '2023-01-01T00:00:00Z',
      };

      component.notifications = [notification];
      component.unreadCount = 1;

      notificationApiService.markAsRead.and.returnValue(
        of({
          ...notification,
          is_read: true,
        })
      );

      component.markAsRead(notification);

      expect(notification.is_read).toBe(true);
      expect(component.unreadCount).toBe(0);
    });

    it('should not mark already read notification', () => {
      const notification: Notification = {
        id: 1,
        type: 'draft_approved',
        message: 'Test notification',
        is_read: true,
        created_at: '2023-01-01T00:00:00Z',
      };

      component.markAsRead(notification);

      expect(notificationApiService.markAsRead).not.toHaveBeenCalled();
    });

    it('should handle errors when marking as read', () => {
      const notification: Notification = {
        id: 1,
        type: 'draft_approved',
        message: 'Test notification',
        is_read: false,
        created_at: '2023-01-01T00:00:00Z',
      };

      notificationApiService.markAsRead.and.returnValue(
        throwError(() => ({ status: 404, message: 'Not found' }))
      );

      component.markAsRead(notification);

      // Notification should remain unread on error
      expect(notification.is_read).toBe(false);
    });
  });

  describe('markAllRead', () => {
    it('should mark all notifications as read', () => {
      component.notifications = [
        {
          id: 1,
          type: 'draft_approved',
          message: 'Notification 1',
          is_read: false,
          created_at: '2023-01-01T00:00:00Z',
        },
        {
          id: 2,
          type: 'draft_edited',
          message: 'Notification 2',
          is_read: false,
          created_at: '2023-01-02T00:00:00Z',
        },
      ];
      component.unreadCount = 2;

      notificationApiService.markAllAsRead.and.returnValue(
        of({ detail: 'All notifications marked as read.' })
      );

      component.markAllRead();

      expect(component.notifications.every(n => n.is_read)).toBe(true);
      expect(component.unreadCount).toBe(0);
    });

    it('should handle errors when marking all as read', () => {
      component.notifications = [
        {
          id: 1,
          type: 'draft_approved',
          message: 'Notification 1',
          is_read: false,
          created_at: '2023-01-01T00:00:00Z',
        },
      ];
      component.unreadCount = 1;

      notificationApiService.markAllAsRead.and.returnValue(
        throwError(() => ({ status: 500, message: 'Server error' }))
      );

      component.markAllRead();

      // Notifications should remain unread on error
      expect(component.notifications[0].is_read).toBe(false);
      expect(component.unreadCount).toBe(1);
    });
  });

  describe('empty state', () => {
    it('should handle empty notifications list', () => {
      notificationApiService.getNotifications.and.returnValue(
        of({
          count: 0,
          next: null,
          previous: null,
          results: [],
        })
      );

      component.loadNotifications();

      expect(component.notifications.length).toBe(0);
      expect(component.unreadCount).toBe(0);
    });
  });
});
