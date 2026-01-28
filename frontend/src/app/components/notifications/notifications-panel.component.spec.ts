import type { MockedObject } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, NavigationEnd } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { NotificationsPanelComponent } from './notifications-panel.component';
import { NotificationApiService } from '../../services/notification-api.service';
import { AuthService } from '../../services/auth.service';
import { NavigationService } from '../../services/navigation.service';
import { GlossaryService } from '../../services/glossary.service';
import { Notification } from '../../models';

describe('NotificationsPanelComponent', () => {
  let component: NotificationsPanelComponent;
  let fixture: ComponentFixture<NotificationsPanelComponent>;
  let notificationApiService: MockedObject<NotificationApiService>;
  let authService: MockedObject<AuthService>;
  let router: MockedObject<Router>;
  let navigationService: MockedObject<NavigationService>;
  let glossaryService: MockedObject<GlossaryService>;
  let routerEvents$: Subject<any>;
  let originalConsoleError: typeof console.error;

  beforeEach(async () => {
    // Suppress console.error during tests
    originalConsoleError = console.error;
    console.error = vi.fn();
    routerEvents$ = new Subject();
    const routerSpy = {
      navigate: vi.fn().mockName('Router.navigate'),
      events: routerEvents$.asObservable(),
    };
    const notificationApiSpy = {
      getNotifications: vi.fn().mockName('NotificationApiService.getNotifications'),
      markAsRead: vi.fn().mockName('NotificationApiService.markAsRead').mockReturnValue(of({})),
      markAllAsRead: vi.fn().mockName('NotificationApiService.markAllAsRead'),
      deleteNotification: vi.fn().mockName('NotificationApiService.deleteNotification'),
    };
    const authSpy = {
            isAuthenticated: vi.fn().mockName('AuthService.isAuthenticated').mockReturnValue(true),
            isOktaCallback: vi.fn().mockName('AuthService.isOktaCallback').mockReturnValue(false),
    };
    const navigationServiceSpy = {
      navigateToDraft: vi.fn().mockName('NavigationService.navigateToDraft'),
    };
    const glossaryServiceSpy = {
      getDraftById: vi.fn().mockName('GlossaryService.getDraftById'),
    };

    await TestBed.configureTestingModule({
      imports: [NotificationsPanelComponent],
      providers: [
        { provide: NotificationApiService, useValue: notificationApiSpy },
        { provide: AuthService, useValue: authSpy },
        { provide: Router, useValue: routerSpy },
        { provide: NavigationService, useValue: navigationServiceSpy },
        { provide: GlossaryService, useValue: glossaryServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationsPanelComponent);
    component = fixture.componentInstance;
    notificationApiService = TestBed.inject(
      NotificationApiService
    ) as MockedObject<NotificationApiService>;
    authService = TestBed.inject(AuthService) as MockedObject<AuthService>;
    router = TestBed.inject(Router) as MockedObject<Router>;
    navigationService = TestBed.inject(
      NavigationService
    ) as MockedObject<NavigationService>;
    glossaryService = TestBed.inject(
      GlossaryService
    ) as MockedObject<GlossaryService>;
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

      notificationApiService.getNotifications.mockReturnValue(
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
      authService.isAuthenticated.mockReturnValue(false);

      fixture.detectChanges();

      expect(notificationApiService.getNotifications).not.toHaveBeenCalled();
    });

    it('should not load notifications if on Okta callback', () => {
      authService.isOktaCallback.mockReturnValue(true);

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

      notificationApiService.getNotifications.mockReturnValue(
        of({
          count: 1,
          next: null,
          previous: null,
          results: mockNotifications,
        })
      );

      fixture.detectChanges();
      notificationApiService.getNotifications.mockClear();

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
      notificationApiService.getNotifications.mockReturnValue(of(mockResponse));

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

      notificationApiService.getNotifications.mockReturnValue(of(mockResponse));

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

      notificationApiService.getNotifications.mockReturnValue(
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
      notificationApiService.getNotifications.mockReturnValue(
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
      notificationApiService.getNotifications.mockReturnValue(
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

      notificationApiService.markAsRead.mockReturnValue(
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

      notificationApiService.markAsRead.mockReturnValue(
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

      notificationApiService.markAllAsRead.mockReturnValue(
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

      notificationApiService.markAllAsRead.mockReturnValue(
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
      notificationApiService.getNotifications.mockReturnValue(
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

  describe('dismissNotification', () => {
    it('should optimistically remove notification from list', () => {
      const notification: Notification = {
        id: 1,
        type: 'draft_approved',
        message: 'Test notification',
        is_read: false,
        created_at: '2023-01-01T00:00:00Z',
        related_draft: 123,
      };

      component.notifications = [notification];
      component.unreadCount = 1;

      // Use of(undefined) which completes synchronously
      notificationApiService.deleteNotification.mockReturnValue(of(undefined));

      const event = { stopPropagation: vi.fn() } as unknown as Event;
      component.dismissNotification(notification, event);

      expect(event.stopPropagation).toHaveBeenCalled();
      expect(component.notifications.length).toBe(0);
      expect(component.unreadCount).toBe(0);
      expect(notificationApiService.deleteNotification).toHaveBeenCalledWith(1);
      // Since of(undefined) completes synchronously, dismissingIds should be cleared immediately
      expect(component.dismissingIds.has(notification.id)).toBe(false);
    });

    it('should remove dismissing state on success', () => {
      const notification: Notification = {
        id: 1,
        type: 'draft_approved',
        message: 'Test notification',
        is_read: false,
        created_at: '2023-01-01T00:00:00Z',
        related_draft: 123,
      };

      component.notifications = [notification];
      component.unreadCount = 1;

      // Use of(undefined) which completes synchronously
      notificationApiService.deleteNotification.mockReturnValue(of(undefined));

      const event = { stopPropagation: vi.fn() } as unknown as Event;
      component.dismissNotification(notification, event);

      // Since of(undefined) completes synchronously, dismissingIds should be cleared immediately
      expect(component.dismissingIds.has(notification.id)).toBe(false);
    });

    it('should rollback on error', () => {
      const notification: Notification = {
        id: 1,
        type: 'draft_approved',
        message: 'Test notification',
        is_read: false,
        created_at: '2023-01-01T00:00:00Z',
        related_draft: 123,
      };

      component.notifications = [notification];
      component.unreadCount = 1;

      notificationApiService.deleteNotification.mockReturnValue(
        throwError(() => ({ status: 500, message: 'Server error' }))
      );

      const event = { stopPropagation: vi.fn() } as unknown as Event;
      component.dismissNotification(notification, event);

      // Should rollback
      expect(component.notifications.length).toBe(1);
      expect(component.unreadCount).toBe(1);
      expect(component.dismissingIds.has(notification.id)).toBe(false);
    });

    it('should not update unread count when dismissing read notification', () => {
      const notification: Notification = {
        id: 1,
        type: 'draft_approved',
        message: 'Test notification',
        is_read: true,
        created_at: '2023-01-01T00:00:00Z',
        related_draft: 123,
      };

      component.notifications = [notification];
      component.unreadCount = 0;

      notificationApiService.deleteNotification.mockReturnValue(of(undefined));

      const event = { stopPropagation: vi.fn() } as unknown as Event;
      component.dismissNotification(notification, event);

      expect(component.notifications.length).toBe(0);
      expect(component.unreadCount).toBe(0);
    });
  });

  describe('hasRelatedContent', () => {
    it('should return true when notification has related_draft', () => {
      const notification: Notification = {
        id: 1,
        type: 'draft_approved',
        message: 'Test notification',
        is_read: false,
        created_at: '2023-01-01T00:00:00Z',
        related_draft: 123,
      };

      expect(component.hasRelatedContent(notification)).toBe(true);
    });

    it('should return true when notification has related_comment', () => {
      const notification: Notification = {
        id: 1,
        type: 'comment_reply',
        message: 'Test notification',
        is_read: false,
        created_at: '2023-01-01T00:00:00Z',
        related_comment: 456,
      };

      expect(component.hasRelatedContent(notification)).toBe(true);
    });

    it('should return false when notification has no related content', () => {
      const notification: Notification = {
        id: 1,
        type: 'draft_approved',
        message: 'Test notification',
        is_read: false,
        created_at: '2023-01-01T00:00:00Z',
      };

      expect(component.hasRelatedContent(notification)).toBe(false);
    });
  });

  describe('navigateToRelatedContent', () => {
    it('should navigate to glossary for published draft', () => {
      const notification: Notification = {
        id: 1,
        type: 'draft_approved',
        message: 'Test notification',
        is_read: true, // Already read to avoid markAsRead call
        created_at: '2023-01-01T00:00:00Z',
        related_draft: 123,
      };

      const mockDraft = {
        id: 123,
        is_published: true,
        entry: { id: 456 },
      };

      glossaryService.getDraftById.mockReturnValue(of(mockDraft));
      component.isOpen = true;

      const event = { stopPropagation: vi.fn() } as unknown as Event;
      component.navigateToRelatedContent(notification, event);

      expect(event.stopPropagation).toHaveBeenCalled();
      expect(glossaryService.getDraftById).toHaveBeenCalledWith(123);
      expect(router.navigate).toHaveBeenCalledWith(['/glossary'], {
        queryParams: { entryId: 456 },
      });
      expect(component.isOpen).toBe(false);
    });

    it('should navigate to draft panel for unpublished draft', () => {
      const notification: Notification = {
        id: 1,
        type: 'draft_approved',
        message: 'Test notification',
        is_read: true, // Already read to avoid markAsRead call
        created_at: '2023-01-01T00:00:00Z',
        related_draft: 123,
      };

      const mockDraft = {
        id: 123,
        is_published: false,
      };

      glossaryService.getDraftById.mockReturnValue(of(mockDraft));
      component.isOpen = true;

      const event = { stopPropagation: vi.fn() } as unknown as Event;
      component.navigateToRelatedContent(notification, event);

      expect(navigationService.navigateToDraft).toHaveBeenCalledWith(123, mockDraft);
      expect(component.isOpen).toBe(false);
    });

    it('should mark notification as read when navigating', () => {
      const notification: Notification = {
        id: 1,
        type: 'draft_approved',
        message: 'Test notification',
        is_read: false,
        created_at: '2023-01-01T00:00:00Z',
        related_draft: 123,
      };

      const mockDraft = {
        id: 123,
        is_published: true,
        entry: { id: 456 },
      };

      glossaryService.getDraftById.mockReturnValue(of(mockDraft));
      notificationApiService.markAsRead.mockReturnValue(
        of({ ...notification, is_read: true })
      );

      const event = { stopPropagation: vi.fn() } as unknown as Event;
      component.navigateToRelatedContent(notification, event);

      expect(notificationApiService.markAsRead).toHaveBeenCalledWith(1);
    });

    it('should not mark as read if already read', () => {
      const notification: Notification = {
        id: 1,
        type: 'draft_approved',
        message: 'Test notification',
        is_read: true,
        created_at: '2023-01-01T00:00:00Z',
        related_draft: 123,
      };

      const mockDraft = {
        id: 123,
        is_published: true,
        entry: { id: 456 },
      };

      glossaryService.getDraftById.mockReturnValue(of(mockDraft));

      const event = { stopPropagation: vi.fn() } as unknown as Event;
      component.navigateToRelatedContent(notification, event);

      expect(notificationApiService.markAsRead).not.toHaveBeenCalled();
    });

    it('should handle error when fetching draft', () => {
      const notification: Notification = {
        id: 1,
        type: 'draft_approved',
        message: 'Test notification',
        is_read: true, // Already read to avoid markAsRead call
        created_at: '2023-01-01T00:00:00Z',
        related_draft: 123,
      };

      glossaryService.getDraftById.mockReturnValue(
        throwError(() => ({ status: 404, message: 'Not found' }))
      );
      component.isOpen = true;

      const event = { stopPropagation: vi.fn() } as unknown as Event;
      component.navigateToRelatedContent(notification, event);

      expect(navigationService.navigateToDraft).toHaveBeenCalledWith(123);
      expect(component.isOpen).toBe(false);
    });

    it('should close panel when notification has no related content', () => {
      const notification: Notification = {
        id: 1,
        type: 'draft_approved',
        message: 'Test notification',
        is_read: true, // Already read to avoid markAsRead call
        created_at: '2023-01-01T00:00:00Z',
      };

      component.isOpen = true;

      const event = { stopPropagation: vi.fn() } as unknown as Event;
      component.navigateToRelatedContent(notification, event);

      expect(component.isOpen).toBe(false);
      expect(glossaryService.getDraftById).not.toHaveBeenCalled();
    });

    it('should close panel for comment notifications (not yet implemented)', () => {
      const notification: Notification = {
        id: 1,
        type: 'comment_reply',
        message: 'Test notification',
        is_read: true, // Already read to avoid markAsRead call
        created_at: '2023-01-01T00:00:00Z',
        related_comment: 456,
      };

      component.isOpen = true;

      const event = { stopPropagation: vi.fn() } as unknown as Event;
      component.navigateToRelatedContent(notification, event);

      expect(component.isOpen).toBe(false);
      expect(glossaryService.getDraftById).not.toHaveBeenCalled();
    });
  });

  describe('closePanel', () => {
    it('should close the panel', () => {
      component.isOpen = true;
      component.closePanel();
      expect(component.isOpen).toBe(false);
    });
  });
});
