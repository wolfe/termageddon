import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Notification, PaginatedResponse } from '../models';
import { GlossaryService } from './glossary.service';

/**
 * Service for managing in-app notifications
 * Separate from NotificationService which handles UI toast notifications
 */
@Injectable({
  providedIn: 'root',
})
export class NotificationApiService {
  constructor(private glossaryService: GlossaryService) {}

  /**
   * Get paginated list of notifications for current user
   */
  getNotifications(page?: number): Observable<PaginatedResponse<Notification>> {
    return this.glossaryService.getNotifications(page);
  }

  /**
   * Mark a notification as read
   */
  markAsRead(notificationId: number): Observable<Notification> {
    return this.glossaryService.markNotificationRead(notificationId);
  }

  /**
   * Mark all notifications as read
   */
  markAllAsRead(): Observable<any> {
    return this.glossaryService.markAllNotificationsRead();
  }

  /**
   * Delete a notification
   */
  deleteNotification(notificationId: number): Observable<void> {
    return this.glossaryService.deleteNotification(notificationId);
  }
}
