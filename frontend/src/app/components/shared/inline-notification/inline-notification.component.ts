import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, Notification } from '../../../services/notification.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-inline-notification',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './inline-notification.component.html',
  styleUrls: ['./inline-notification.component.scss']
})
export class InlineNotificationComponent implements OnInit, OnDestroy {
  notification: Notification | null = null;
  isVisible: boolean = false;
  isFading: boolean = false;
  isResetting: boolean = false;
  private destroy$ = new Subject<void>();
  private autoHideTimer: any = null;

  constructor(private notificationService: NotificationService) {}

  ngOnInit(): void {
    this.notificationService.notification$
      .pipe(takeUntil(this.destroy$))
      .subscribe((notification: Notification | null) => {
        // Clear any existing timer
        if (this.autoHideTimer) {
          clearTimeout(this.autoHideTimer);
          this.autoHideTimer = null;
        }

        // Reset all states immediately
        this.isVisible = false;
        this.isFading = false;
        this.isResetting = true;
        
        this.notification = notification;
        
        // If there's a notification, start fresh
        if (notification) {
          // Use setTimeout to ensure CSS reset completes
          setTimeout(() => {
            this.isResetting = false;
            this.isVisible = true;
            this.isFading = false;
            
            // Show for 5 seconds, then start fade-out
            this.autoHideTimer = setTimeout(() => {
              this.isFading = true;
              // After fade completes, remove the notification
              setTimeout(() => {
                this.notification = null;
                this.isVisible = false;
                this.isFading = false;
              }, 3000);
              this.autoHideTimer = null;
            }, 5000);
          }, 50); // Small delay to ensure CSS reset
        } else {
          this.isResetting = false;
        }
      });
  }

  ngOnDestroy(): void {
    if (this.autoHideTimer) {
      clearTimeout(this.autoHideTimer);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  getIconClass(notification: Notification): string {
    switch (notification.type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      case 'info':
      default:
        return 'ℹ';
    }
  }

  getNotificationClass(notification: Notification): string {
    const baseClass = 'inline-notification';
    const typeClass = `notification-${notification.type}`;
    return `${baseClass} ${typeClass}`;
  }
}
