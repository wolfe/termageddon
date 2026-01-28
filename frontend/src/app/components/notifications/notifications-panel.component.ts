import { Component, OnInit, OnDestroy, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { OverlayModule } from '@angular/cdk/overlay';

import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { Notification } from '../../models';
import { NotificationApiService } from '../../services/notification-api.service';
import { AuthService } from '../../services/auth.service';
import { NavigationService } from '../../services/navigation.service';
import { GlossaryService } from '../../services/glossary.service';
import { RelativeTimePipe } from '../../pipes/relative-time.pipe';

@Component({
    selector: 'app-notifications-panel',
    imports: [RelativeTimePipe, OverlayModule],
    standalone: true,
    template: `
    <div class="notifications-container">
      <button
        #bellButton="cdkOverlayOrigin"
        cdkOverlayOrigin
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

      <ng-template
        cdkConnectedOverlay
        [cdkConnectedOverlayOrigin]="bellButton"
        [cdkConnectedOverlayOpen]="isOpen"
        [cdkConnectedOverlayOffsetY]="8"
        [cdkConnectedOverlayPositions]="[
          {originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top'}
        ]"
        (overlayOutsideClick)="closePanel()"
      >
        <div class="notifications-dropdown">
          <div class="notifications-header">
            <h3>Notifications</h3>
            <div class="header-actions">
              @if (unreadCount > 0) {
                <button (click)="markAllRead()" class="mark-all-read-btn">Mark all read</button>
              }
              <button (click)="closePanel()" class="close-btn" title="Close">
                <span>&times;</span>
              </button>
            </div>
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
                  [class.dismissing]="dismissingIds.has(notification.id)"
                >
                  <div class="notification-content">
                    <span class="unread-indicator" [class.visible]="!notification.is_read"></span>
                    <div class="notification-text">
                      <p class="notification-message">{{ notification.message }}</p>
                      <span class="notification-time">{{ notification.created_at | relativeTime }}</span>
                    </div>
                  </div>
                  <div class="notification-actions">
                    <button
                      (click)="navigateToRelatedContent(notification, $event)"
                      class="navigate-btn"
                      [title]="'Go to related content'"
                      [disabled]="!hasRelatedContent(notification)"
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M6 3L11 8L6 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    </button>
                    <button
                      (click)="dismissNotification(notification, $event)"
                      class="dismiss-btn"
                      [title]="'Dismiss notification'"
                      [disabled]="dismissingIds.has(notification.id)"
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M2 4h12M5 4V2a1 1 0 011-1h4a1 1 0 011 1v2m3 0v10a1 1 0 01-1 1H3a1 1 0 01-1-1V4h12zM6 7v5M10 7v5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    </button>
                  </div>
                </div>
              }
            }
          </div>
        </div>
      </ng-template>
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

        .header-actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
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

        .close-btn {
          background: none;
          border: none;
          color: #6b7280;
          cursor: pointer;
          font-size: 1.25rem;
          line-height: 1;
          padding: 0.25rem;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          transition: background-color 0.2s;

          &:hover {
            background-color: #f3f4f6;
            color: #111827;
          }

          span {
            display: block;
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
        transition: background-color 0.2s, opacity 0.2s;
        position: relative;

        &.unread {
          background-color: #eff6ff;
        }

        &.dismissing {
          opacity: 0.5;
          pointer-events: none;
        }

        &:hover:not(.dismissing) {
          background-color: #f9fafb;
        }

        .notification-content {
          flex: 1;
          min-width: 0;
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;

          .unread-indicator {
            width: 8px;
            height: 8px;
            background: #3b82f6;
            border-radius: 50%;
            flex-shrink: 0;
            margin-top: 0.375rem;
            opacity: 0;
            visibility: hidden;

            &.visible {
              opacity: 1;
              visibility: visible;
            }
          }

          .notification-text {
            flex: 1;
            min-width: 0;

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
        }

        .notification-actions {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          flex-shrink: 0;
          margin-left: 0.5rem;

          .navigate-btn {
            background: none;
            border: none;
            color: #6b7280;
            cursor: pointer;
            padding: 0.375rem;
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 4px;
            transition: background-color 0.2s, color 0.2s;

            &:hover:not(:disabled) {
              background-color: #e0e7ff;
              color: #3b82f6;
            }

            &:disabled {
              cursor: not-allowed;
              opacity: 0.4;
            }

            svg {
              display: block;
            }
          }

          .dismiss-btn {
            background: none;
            border: none;
            color: #9ca3af;
            cursor: pointer;
            padding: 0.375rem;
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 4px;
            transition: background-color 0.2s, color 0.2s;

            &:hover:not(:disabled) {
              background-color: #fee2e2;
              color: #dc2626;
            }

            &:disabled {
              cursor: not-allowed;
              opacity: 0.5;
            }

            svg {
              display: block;
            }
          }
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
  dismissingIds = new Set<number>();

  private destroyRef = inject(DestroyRef);

  constructor(
    private notificationApiService: NotificationApiService,
    private router: Router,
    private authService: AuthService,
    private navigationService: NavigationService,
    private glossaryService: GlossaryService
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

  closePanel() {
    this.isOpen = false;
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

  hasRelatedContent(notification: Notification): boolean {
    return !!(notification.related_draft || notification.related_comment);
  }

  navigateToRelatedContent(notification: Notification, event: Event) {
    event.stopPropagation();

    // Mark as read if not already read
    if (!notification.is_read) {
      this.markAsRead(notification);
    }

    // Navigate based on related content
    const draftId = notification.related_draft;
    if (draftId) {
      // Fetch the draft to determine if it's published and get the entry ID
      this.glossaryService.getDraftById(draftId).subscribe({
        next: draft => {
          if (draft.is_published && draft.entry?.id) {
            // For published drafts, navigate to the entry in glossary
            this.router.navigate(['/glossary'], {
              queryParams: { entryId: draft.entry.id },
            });
          } else {
            // For unpublished drafts, use the draft router
            this.navigationService.navigateToDraft(draftId, draft);
          }
          this.closePanel();
        },
        error: error => {
          console.error('Failed to load draft for navigation:', error);
          // Fallback: try navigating to draft anyway
          this.navigationService.navigateToDraft(draftId);
          this.closePanel();
        },
      });
    } else if (notification.related_comment) {
      // For comments, we need the draft ID to navigate
      // The backend serializer currently only returns the comment ID, not the nested draft
      // TODO: Enhance backend NotificationSerializer to include related_comment.draft.id
      // For now, we'll close the panel - comment navigation can be enhanced later
      console.warn('Comment navigation requires draft ID - backend serializer needs enhancement');
      this.closePanel();
    } else {
      // No related content, just close the panel
      this.closePanel();
    }
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

  dismissNotification(notification: Notification, event: Event) {
    event.stopPropagation();

    // Optimistic update: remove from list immediately
    const index = this.notifications.findIndex(n => n.id === notification.id);
    if (index === -1) return;

    this.dismissingIds.add(notification.id);
    const originalNotifications = [...this.notifications];
    this.notifications.splice(index, 1);
    if (!notification.is_read) {
      this.unreadCount = Math.max(0, this.unreadCount - 1);
    }

    // Call API to delete
    this.notificationApiService.deleteNotification(notification.id).subscribe({
      next: () => {
        this.dismissingIds.delete(notification.id);
      },
      error: error => {
        console.error('Error dismissing notification:', error);
        // Rollback on error
        this.notifications = originalNotifications;
        if (!notification.is_read) {
          this.unreadCount++;
        }
        this.dismissingIds.delete(notification.id);
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
