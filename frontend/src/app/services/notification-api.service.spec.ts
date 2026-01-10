import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NotificationApiService } from './notification-api.service';
import { GlossaryService } from './glossary.service';
import { Notification, PaginatedResponse } from '../models';
import { of, throwError } from 'rxjs';

describe('NotificationApiService', () => {
  let service: NotificationApiService;
  let glossaryService: jasmine.SpyObj<GlossaryService>;

  beforeEach(() => {
    const glossarySpy = jasmine.createSpyObj('GlossaryService', [
      'getNotifications',
      'markNotificationRead',
      'markAllNotificationsRead',
    ]);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        NotificationApiService,
        { provide: GlossaryService, useValue: glossarySpy },
      ],
    });
    service = TestBed.inject(NotificationApiService);
    glossaryService = TestBed.inject(GlossaryService) as jasmine.SpyObj<GlossaryService>;
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

      glossaryService.getNotifications.and.returnValue(of(mockNotifications));

      service.getNotifications().subscribe(response => {
        expect(response).toEqual(mockNotifications);
        expect(glossaryService.getNotifications).toHaveBeenCalledWith(undefined);
      });
    });

    it('should get notifications with page number', () => {
      const mockNotifications: PaginatedResponse<Notification> = {
        count: 50,
        next: 'http://localhost:8000/api/notifications/?page=2',
        previous: null,
        results: [],
      };

      glossaryService.getNotifications.and.returnValue(of(mockNotifications));

      service.getNotifications(2).subscribe(response => {
        expect(response).toEqual(mockNotifications);
        expect(glossaryService.getNotifications).toHaveBeenCalledWith(2);
      });
    });

    it('should handle errors when getting notifications', () => {
      glossaryService.getNotifications.and.returnValue(
        throwError(() => ({ status: 500, message: 'Server error' }))
      );

      service.getNotifications().subscribe({
        next: () => fail('Should have failed'),
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

      glossaryService.markNotificationRead.and.returnValue(of(mockNotification));

      service.markAsRead(1).subscribe(response => {
        expect(response).toEqual(mockNotification);
        expect(response.is_read).toBe(true);
        expect(glossaryService.markNotificationRead).toHaveBeenCalledWith(1);
      });
    });

    it('should handle errors when marking notification as read', () => {
      glossaryService.markNotificationRead.and.returnValue(
        throwError(() => ({ status: 404, message: 'Not found' }))
      );

      service.markAsRead(999).subscribe({
        next: () => fail('Should have failed'),
        error: error => {
          expect(error.status).toBe(404);
        },
      });
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read', () => {
      glossaryService.markAllNotificationsRead.and.returnValue(
        of({ detail: 'All notifications marked as read.' })
      );

      service.markAllAsRead().subscribe(response => {
        expect(response).toBeDefined();
        expect(glossaryService.markAllNotificationsRead).toHaveBeenCalled();
      });
    });

    it('should handle errors when marking all as read', () => {
      glossaryService.markAllNotificationsRead.and.returnValue(
        throwError(() => ({ status: 500, message: 'Server error' }))
      );

      service.markAllAsRead().subscribe({
        next: () => fail('Should have failed'),
        error: error => {
          expect(error.status).toBe(500);
        },
      });
    });
  });
});
