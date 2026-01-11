import type { MockedObject } from 'vitest';
import { vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { InlineNotificationComponent } from './inline-notification.component';
import { NotificationService, Notification } from '../../../services/notification.service';
import { BehaviorSubject } from 'rxjs';

describe('InlineNotificationComponent', () => {
  let component: InlineNotificationComponent;
  let fixture: ComponentFixture<InlineNotificationComponent>;
  let notificationService: MockedObject<NotificationService>;
  let notificationSubject: BehaviorSubject<Notification | null>;

  beforeEach(async () => {
    notificationSubject = new BehaviorSubject<Notification | null>(null);
    const spy = {
      notification$: notificationSubject.asObservable(),
    };

    await TestBed.configureTestingModule({
      imports: [InlineNotificationComponent, BrowserAnimationsModule],
      providers: [{ provide: NotificationService, useValue: spy }],
    }).compileComponents();

    fixture = TestBed.createComponent(InlineNotificationComponent);
    component = fixture.componentInstance;
    notificationService = TestBed.inject(NotificationService) as MockedObject<NotificationService>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display notification when one is provided', () => {
    const testNotification: Notification = {
      id: 'test-1',
      type: 'success',
      message: 'Test success message',
    };

    notificationSubject.next(testNotification);
    fixture.detectChanges();

    const compiled = fixture.nativeElement;
    expect(compiled.textContent).toContain('Test success message');
    expect(compiled.textContent).toContain('✓');
  });

  it('should not display anything when no notification', () => {
    notificationSubject.next(null);
    fixture.detectChanges();

    const compiled = fixture.nativeElement;
    expect(compiled.textContent).toBe('');
  });

  it('should show correct icon for success notification', () => {
    const notification: Notification = {
      id: 'test-success',
      type: 'success',
      message: 'Test success message',
    };

    notificationSubject.next(notification);
    fixture.detectChanges();

    const compiled = fixture.nativeElement;
    expect(compiled.textContent).toContain('✓');
  });

  it('should show correct icon for error notification', () => {
    const notification: Notification = {
      id: 'test-error',
      type: 'error',
      message: 'Test error message',
    };

    notificationSubject.next(notification);
    fixture.detectChanges();

    const compiled = fixture.nativeElement;
    expect(compiled.textContent).toContain('✕');
  });

  it('should show correct icon for warning notification', () => {
    const notification: Notification = {
      id: 'test-warning',
      type: 'warning',
      message: 'Test warning message',
    };

    notificationSubject.next(notification);
    fixture.detectChanges();

    const compiled = fixture.nativeElement;
    expect(compiled.textContent).toContain('⚠');
  });

  it('should show correct icon for info notification', () => {
    const notification: Notification = {
      id: 'test-info',
      type: 'info',
      message: 'Test info message',
    };

    notificationSubject.next(notification);
    fixture.detectChanges();

    const compiled = fixture.nativeElement;
    expect(compiled.textContent).toContain('ℹ');
  });

  it('should apply correct CSS class for success notification', () => {
    const notification: Notification = {
      id: 'test-success',
      type: 'success',
      message: 'Test success message',
    };

    notificationSubject.next(notification);
    fixture.detectChanges();

    const compiled = fixture.nativeElement;
    const notificationElement = compiled.querySelector('.inline-notification');
    expect(notificationElement.classList.contains('notification-success')).toBe(true);
  });

  it('should apply correct CSS class for error notification', () => {
    const notification: Notification = {
      id: 'test-error',
      type: 'error',
      message: 'Test error message',
    };

    notificationSubject.next(notification);
    fixture.detectChanges();

    const compiled = fixture.nativeElement;
    const notificationElement = compiled.querySelector('.inline-notification');
    expect(notificationElement.classList.contains('notification-error')).toBe(true);
  });

  it('should apply correct CSS class for warning notification', () => {
    const notification: Notification = {
      id: 'test-warning',
      type: 'warning',
      message: 'Test warning message',
    };

    notificationSubject.next(notification);
    fixture.detectChanges();

    const compiled = fixture.nativeElement;
    const notificationElement = compiled.querySelector('.inline-notification');
    expect(notificationElement.classList.contains('notification-warning')).toBe(true);
  });

  it('should apply correct CSS class for info notification', () => {
    const notification: Notification = {
      id: 'test-info',
      type: 'info',
      message: 'Test info message',
    };

    notificationSubject.next(notification);
    fixture.detectChanges();

    const compiled = fixture.nativeElement;
    const notificationElement = compiled.querySelector('.inline-notification');
    expect(notificationElement.classList.contains('notification-info')).toBe(true);
  });

  it('should replace previous notification when new one arrives', async () => {
    vi.useFakeTimers();
    const firstNotification: Notification = {
      id: 'test-1',
      type: 'success',
      message: 'First message',
    };

    const secondNotification: Notification = {
      id: 'test-2',
      type: 'error',
      message: 'Second message',
    };

    // Show first notification
    notificationSubject.next(firstNotification);
    // Wait for component's setTimeout to complete
    vi.advanceTimersByTime(100);
    await fixture.whenStable();

    // Check component state directly to avoid change detection issues
    expect(component.notification).toEqual(firstNotification);

    // Replace with second notification
    notificationSubject.next(secondNotification);
    vi.advanceTimersByTime(100);
    await fixture.whenStable();

    // Verify the notification was replaced
    expect(component.notification).toEqual(secondNotification);
    expect(component.notification?.id).toBe('test-2');
    expect(component.notification?.type).toBe('error');

    vi.useRealTimers();
  });

  it('should clean up subscription on destroy', () => {
    const destroySpy = vi.spyOn(component['destroy$'], 'next');
    const completeSpy = vi.spyOn(component['destroy$'], 'complete');

    component.ngOnDestroy();

    expect(destroySpy).toHaveBeenCalled();
    expect(completeSpy).toHaveBeenCalled();
  });
});
