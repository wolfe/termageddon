import type { MockedObject } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NotificationApiService } from './notification-api.service';
import { GlossaryService } from './glossary.service';
import { Notification, PaginatedResponse } from '../models';
import { of, throwError } from 'rxjs';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('NotificationApiService', () => {
  let service: NotificationApiService;
  let glossaryService: MockedObject<GlossaryService>;

  beforeEach(() => {
    const glossarySpy = {
      getNotifications: vi.fn().mockName('GlossaryService.getNotifications'),
      markNotificationRead: vi.fn().mockName('GlossaryService.markNotificationRead'),
      markAllNotificationsRead: vi.fn().mockName('GlossaryService.markAllNotificationsRead'),
      deleteNotification: vi.fn().mockName('GlossaryService.deleteNotification'),
    };

    TestBed.configureTestingModule({
      imports: [],
      providers: [
        NotificationApiService,
        { provide: GlossaryService, useValue: glossarySpy },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(NotificationApiService);
    glossaryService = TestBed.inject(GlossaryService) as MockedObject<GlossaryService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getNotifications', () => {
    it('should get notifications from glossary service', () => {
      const mockNotifications: PaginatedResponse<Notification> = {
        count: 2,
        next: null,
        previous: null,
        results: [
          {
            id: 1,
            type: 'draft_approved',
            message: 'Test notification 1',
            is_read: false,
            created_at: '2023-01-01T00:00:00Z',
          },
          {
            id: 2,
            type: 'draft_edited',
            message: 'Test notification 2',
            is_read: true,
            created_at: '2023-01-02T00:00:00Z',
          },
        ],
      };

      glossaryService.getNotifications.mockReturnValue(of(mockNotifications));

      service.getNotifications().subscribe(response => {
        expect(response).toEqual(mockNotifications);
        expect(glossaryService.getNotifications).toHaveBeenCalledWith(undefined);
      });
    });

    it('should get notifications with page number', () => {
      const mockNotifications: PaginatedResponse<Notification> = {
        count: 50,
        next: '/api/notifications/?page=2',
        previous: null,
        results: [],
      };

      glossaryService.getNotifications.mockReturnValue(of(mockNotifications));

      service.getNotifications(2).subscribe(response => {
        expect(response).toEqual(mockNotifications);
        expect(glossaryService.getNotifications).toHaveBeenCalledWith(2);
      });
    });

    it('should handle errors when getting notifications', () => {
      glossaryService.getNotifications.mockReturnValue(
        throwError(() => ({ status: 500, message: 'Server error' }))
      );

      service.getNotifications().subscribe({
        next: () => {
          throw new Error('Should have failed');
        },
        error: error => {
          expect(error.status).toBe(500);
        },
      });
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', () => {
      const mockNotification: Notification = {
        id: 1,
        type: 'draft_approved',
        message: 'Test notification',
        is_read: true,
        created_at: '2023-01-01T00:00:00Z',
      };

      glossaryService.markNotificationRead.mockReturnValue(of(mockNotification));

      service.markAsRead(1).subscribe(response => {
        expect(response).toEqual(mockNotification);
        expect(response.is_read).toBe(true);
        expect(glossaryService.markNotificationRead).toHaveBeenCalledWith(1);
      });
    });

    it('should handle errors when marking notification as read', () => {
      glossaryService.markNotificationRead.mockReturnValue(
        throwError(() => ({ status: 404, message: 'Not found' }))
      );

      service.markAsRead(999).subscribe({
        next: () => {
          throw new Error('Should have failed');
        },
        error: error => {
          expect(error.status).toBe(404);
        },
      });
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read', () => {
      glossaryService.markAllNotificationsRead.mockReturnValue(
        of({ detail: 'All notifications marked as read.' })
      );

      service.markAllAsRead().subscribe(response => {
        expect(response).toBeDefined();
        expect(glossaryService.markAllNotificationsRead).toHaveBeenCalled();
      });
    });

    it('should handle errors when marking all as read', () => {
      glossaryService.markAllNotificationsRead.mockReturnValue(
        throwError(() => ({ status: 500, message: 'Server error' }))
      );

      service.markAllAsRead().subscribe({
        next: () => {
          throw new Error('Should have failed');
        },
        error: error => {
          expect(error.status).toBe(500);
        },
      });
    });
  });

  describe('deleteNotification', () => {
    it('should delete notification', () => {
      glossaryService.deleteNotification.mockReturnValue(of(undefined));

      service.deleteNotification(1).subscribe(() => {
        expect(glossaryService.deleteNotification).toHaveBeenCalledWith(1);
      });
    });

    it('should handle errors when deleting notification', () => {
      glossaryService.deleteNotification.mockReturnValue(
        throwError(() => ({ status: 404, message: 'Not found' }))
      );

      service.deleteNotification(999).subscribe({
        next: () => {
          throw new Error('Should have failed');
        },
        error: error => {
          expect(error.status).toBe(404);
        },
      });
    });
  });
});
