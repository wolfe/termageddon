import type { MockedObject } from 'vitest';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
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

  it('should show correct icon for different notification types', () => {
    const testCases = [
      { type: 'success' as const, expectedIcon: '✓' },
      { type: 'error' as const, expectedIcon: '✕' },
      { type: 'warning' as const, expectedIcon: '⚠' },
      { type: 'info' as const, expectedIcon: 'ℹ' },
    ];

    testCases.forEach(({ type, expectedIcon }) => {
      const notification: Notification = {
        id: `test-${type}`,
        type,
        message: `Test ${type} message`,
      };

      notificationSubject.next(notification);
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain(expectedIcon);
    });
  });

  it('should apply correct CSS classes for different notification types', () => {
    const testCases = [
      { type: 'success' as const, expectedClass: 'notification-success' },
      { type: 'error' as const, expectedClass: 'notification-error' },
      { type: 'warning' as const, expectedClass: 'notification-warning' },
      { type: 'info' as const, expectedClass: 'notification-info' },
    ];

    testCases.forEach(({ type, expectedClass }) => {
      const notification: Notification = {
        id: `test-${type}`,
        type,
        message: `Test ${type} message`,
      };

      notificationSubject.next(notification);
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const notificationElement = compiled.querySelector('.inline-notification');
      expect(notificationElement.classList.contains(expectedClass)).toBe(true);
    });
  });

  it('should replace previous notification when new one arrives', () => {
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
    fixture.detectChanges();

    let compiled = fixture.nativeElement;
    expect(compiled.textContent).toContain('First message');
    expect(compiled.textContent).toContain('✓');

    // Replace with second notification
    notificationSubject.next(secondNotification);
    fixture.detectChanges();

    compiled = fixture.nativeElement;
    expect(compiled.textContent).toContain('Second message');
    expect(compiled.textContent).toContain('✕');
    expect(compiled.textContent).not.toContain('First message');
  });

  it('should clean up subscription on destroy', () => {
    const destroySpy = vi.spyOn(component['destroy$'], 'next');
    const completeSpy = vi.spyOn(component['destroy$'], 'complete');

    component.ngOnDestroy();

    expect(destroySpy).toHaveBeenCalled();
    expect(completeSpy).toHaveBeenCalled();
  });
});
