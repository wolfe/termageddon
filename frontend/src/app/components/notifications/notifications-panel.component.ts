import { Component, OnInit, OnDestroy, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { Notification } from '../../models';
import { NotificationApiService } from '../../services/notification-api.service';
import { AuthService } from '../../services/auth.service';
import { RelativeTimePipe } from '../../pipes/relative-time.pipe';

@Component({
    selector: 'app-notifications-panel',
    imports: [RelativeTimePipe],
    standalone: true,
    template: `
    <div class="notifications-container">
      <button
        (click)="togglePanel()"
        class="notification-button"
        [class.has-unread]="unreadCount > 0"
        [title]="unreadCount > 0 ? unreadCount + ' unread notifications' : 'Notifications'"
      >
        🔔
        @if (unreadCount > 0) {
          <span class="badge">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
        }
      </button>

      @if (isOpen) {
        <div class="notifications-dropdown">
          <div class="notifications-header">
            <h3>Notifications</h3>
            @if (unreadCount > 0) {
              <button (click)="markAllRead()" class="mark-all-read-btn">Mark all read</button>
            }
          </div>
          <div class="notifications-list">
            @if (loading) {
              <div class="loading">Loading notifications...</div>
            } @else if (notifications.length === 0) {
              <div class="empty-state">No notifications</div>
            } @else {
              @for (notification of notifications; track notification.id) {
                <div
                  class="notification-item"
                  [class.unread]="!notification.is_read"
                  (click)="markAsRead(notification)"
                >
                  <div class="notification-content">
                    <p class="notification-message">{{ notification.message }}</p>
                    <span class="notification-time">{{ notification.created_at | relativeTime }}</span>
                  </div>
                  @if (!notification.is_read) {
                    <span class="unread-indicator"></span>
                  }
                </div>
              }
            }
          </div>
        </div>
      }
    </div>
  `,
    styles: [
        `
      .notifications-container {
        position: relative;
      }

      .notification-button {
        position: relative;
        background: none;
        border: none;
        color: white;
        font-size: 1.25rem;
        cursor: pointer;
        padding: 0.5rem;
        border-radius: 4px;
        transition: background-color 0.2s;

        &:hover {
          background-color: rgba(255, 255, 255, 0.1);
        }

        .badge {
          position: absolute;
          top: 0;
          right: 0;
          background: #ef4444;
          color: white;
          border-radius: 50%;
          width: 18px;
          height: 18px;
          font-size: 0.75rem;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
        }
      }

      .notifications-dropdown {
        position: absolute;
        top: 100%;
        right: 0;
        margin-top: 0.5rem;
        width: 400px;
        max-height: 500px;
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        z-index: 1000;
        display: flex;
        flex-direction: column;
      }

      .notifications-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem;
        border-bottom: 1px solid #e5e7eb;

        h3 {
          margin: 0;
          font-size: 1rem;
          font-weight: 600;
        }

        .mark-all-read-btn {
          background: none;
          border: none;
          color: #3b82f6;
          cursor: pointer;
          font-size: 0.875rem;
          padding: 0.25rem 0.5rem;

          &:hover {
            text-decoration: underline;
          }
        }
      }

      .notifications-list {
        overflow-y: auto;
        max-height: 400px;
      }

      .notification-item {
        display: flex;
        padding: 0.75rem 1rem;
        border-bottom: 1px solid #f3f4f6;
        cursor: pointer;
        transition: background-color 0.2s;
        position: relative;

        &:hover {
          background-color: #f9fafb;
        }

        &.unread {
          background-color: #eff6ff;
        }

        .notification-content {
          flex: 1;

          .notification-message {
            margin: 0 0 0.25rem 0;
            font-size: 0.875rem;
            color: #111827;
          }

          .notification-time {
            font-size: 0.75rem;
            color: #6b7280;
          }
        }

        .unread-indicator {
          width: 8px;
          height: 8px;
          background: #3b82f6;
          border-radius: 50%;
          margin-left: 0.5rem;
          flex-shrink: 0;
          margin-top: 0.5rem;
        }
      }

      .loading,
      .empty-state {
        padding: 2rem;
        text-align: center;
        color: #6b7280;
        font-size: 0.875rem;
      }
    `,
    ]
})
export class NotificationsPanelComponent implements OnInit, OnDestroy {
  notifications: Notification[] = [];
  unreadCount: number = 0;
  isOpen: boolean = false;
  loading: boolean = false;

  private destroyRef = inject(DestroyRef);

  constructor(
    private notificationApiService: NotificationApiService,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit() {
    // Only load notifications if user is authenticated and not handling Okta callback
    if (this.authService.isAuthenticated() && !this.authService.isOktaCallback()) {
      this.loadNotifications();
    }

    // Refresh notifications when view changes (user navigates)
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        if (!this.isOpen && this.authService.isAuthenticated()) {
          // Only refresh count when panel is closed (to avoid interrupting user)
          this.loadNotifications();
        }
      });
  }

  togglePanel() {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.loadNotifications();
    }
  }

  loadNotifications() {
    this.loading = true;
    this.notificationApiService.getNotifications().subscribe({
      next: response => {
        this.notifications = response.results;
        this.unreadCount = this.notifications.filter(n => !n.is_read).length;
        this.loading = false;
      },
      error: error => {
        console.error('Error loading notifications:', error);
        this.loading = false;
      },
    });
  }

  markAsRead(notification: Notification) {
    if (notification.is_read) return;

    this.notificationApiService.markAsRead(notification.id).subscribe({
      next: () => {
        notification.is_read = true;
        this.unreadCount = Math.max(0, this.unreadCount - 1);
      },
      error: error => {
        console.error('Error marking notification as read:', error);
      },
    });
  }

  markAllRead() {
    this.notificationApiService.markAllAsRead().subscribe({
      next: () => {
        this.notifications.forEach(n => (n.is_read = true));
        this.unreadCount = 0;
      },
      error: error => {
        console.error('Error marking all notifications as read:', error);
      },
    });
  }

  ngOnDestroy(): void {
    // Cleanup handled by DestroyRef
  }
}
