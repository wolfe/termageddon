import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, timer } from 'rxjs';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notificationSubject = new BehaviorSubject<Notification | null>(null);
  public notification$ = this.notificationSubject.asObservable();

  private nextId = 1;

  constructor() {}

  /**
   * Show a notification
   * @param type - The type of notification
   * @param message - The message to display
   */
  show(type: Notification['type'], message: string): string {
    const id = `notification-${this.nextId++}`;

    const notification: Notification = {
      id,
      type,
      message
    };

    // Replace any existing notification
    this.notificationSubject.next(notification);

    // Auto-dismiss after 8 seconds (5s visible + 3s fade)
    timer(8000).subscribe(() => {
      this.dismiss();
    });

    return id;
  }

  /**
   * Show a success notification
   */
  success(message: string): string {
    return this.show('success', message);
  }

  /**
   * Show an error notification
   */
  error(message: string): string {
    return this.show('error', message);
  }

  /**
   * Show an info notification
   */
  info(message: string): string {
    return this.show('info', message);
  }

  /**
   * Show a warning notification
   */
  warning(message: string): string {
    return this.show('warning', message);
  }

  /**
   * Dismiss the current notification
   */
  dismiss(): void {
    this.notificationSubject.next(null);
  }

  /**
   * Clear the current notification
   */
  clear(): void {
    this.notificationSubject.next(null);
  }

  /**
   * Get current notification
   */
  getNotification(): Notification | null {
    return this.notificationSubject.value;
  }
}
