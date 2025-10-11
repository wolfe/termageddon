import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, timer } from 'rxjs';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration?: number; // Duration in milliseconds, 0 means no auto-dismiss
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  public notifications$ = this.notificationsSubject.asObservable();

  private nextId = 1;

  constructor() {}

  /**
   * Show a notification
   * @param type - The type of notification
   * @param message - The message to display
   * @param duration - Duration in milliseconds (default: 5000 for info, 0 for others)
   */
  show(type: Notification['type'], message: string, duration?: number): string {
    const id = `notification-${this.nextId++}`;
    
    // Set default duration based on type
    if (duration === undefined) {
      duration = type === 'info' ? 5000 : 0;
    }

    const notification: Notification = {
      id,
      type,
      message,
      duration
    };

    const currentNotifications = this.notificationsSubject.value;
    this.notificationsSubject.next([...currentNotifications, notification]);

    // Auto-dismiss if duration is specified and > 0
    if (duration > 0) {
      timer(duration).subscribe(() => {
        this.dismiss(id);
      });
    }

    return id;
  }

  /**
   * Show a success notification
   */
  success(message: string, duration?: number): string {
    return this.show('success', message, duration);
  }

  /**
   * Show an error notification
   */
  error(message: string, duration?: number): string {
    return this.show('error', message, duration);
  }

  /**
   * Show an info notification
   */
  info(message: string, duration?: number): string {
    return this.show('info', message, duration);
  }

  /**
   * Show a warning notification
   */
  warning(message: string, duration?: number): string {
    return this.show('warning', message, duration);
  }

  /**
   * Dismiss a notification by ID
   */
  dismiss(id: string): void {
    const currentNotifications = this.notificationsSubject.value;
    this.notificationsSubject.next(
      currentNotifications.filter(notification => notification.id !== id)
    );
  }

  /**
   * Clear all notifications
   */
  clear(): void {
    this.notificationsSubject.next([]);
  }

  /**
   * Get current notifications
   */
  getNotifications(): Notification[] {
    return this.notificationsSubject.value;
  }
}
