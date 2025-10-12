import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NotificationService, Notification } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [NotificationService]
    });
    service = TestBed.inject(NotificationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Single notification behavior', () => {
    it('should show success notification', () => {
      const message = 'Success message';
      
      service.success(message);
      
      const notification = service.getNotification();
      expect(notification).toBeTruthy();
      expect(notification!.message).toBe(message);
      expect(notification!.type).toBe('success');
      expect(notification!.id).toBeDefined();
    });

    it('should show error notification', () => {
      const message = 'Error message';
      
      service.error(message);
      
      const notification = service.getNotification();
      expect(notification).toBeTruthy();
      expect(notification!.message).toBe(message);
      expect(notification!.type).toBe('error');
      expect(notification!.id).toBeDefined();
    });

    it('should show warning notification', () => {
      const message = 'Warning message';
      
      service.warning(message);
      
      const notification = service.getNotification();
      expect(notification).toBeTruthy();
      expect(notification!.message).toBe(message);
      expect(notification!.type).toBe('warning');
      expect(notification!.id).toBeDefined();
    });

    it('should show info notification', () => {
      const message = 'Info message';
      
      service.info(message);
      
      const notification = service.getNotification();
      expect(notification).toBeTruthy();
      expect(notification!.message).toBe(message);
      expect(notification!.type).toBe('info');
      expect(notification!.id).toBeDefined();
    });

    it('should generate unique IDs for notifications', () => {
      const id1 = service.success('First notification');
      const id2 = service.error('Second notification');
      const id3 = service.warning('Third notification');

      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
      expect(id1).not.toBe(id3);
    });

    it('should replace previous notification with new one', () => {
      const firstId = service.success('First notification');
      const firstNotification = service.getNotification();
      
      expect(firstNotification!.message).toBe('First notification');
      
      const secondId = service.error('Second notification');
      const secondNotification = service.getNotification();
      
      expect(secondNotification!.message).toBe('Second notification');
      expect(secondNotification!.type).toBe('error');
      expect(secondId).not.toBe(firstId);
    });

    it('should dismiss current notification', () => {
      service.success('Test notification');
      
      expect(service.getNotification()).toBeTruthy();
      
      service.dismiss();
      
      expect(service.getNotification()).toBeNull();
    });

    it('should clear current notification', () => {
      service.success('Test notification');
      
      expect(service.getNotification()).toBeTruthy();
      
      service.clear();
      
      expect(service.getNotification()).toBeNull();
    });

    it('should auto-dismiss notification after 5 seconds', fakeAsync(() => {
      service.success('Test notification');
      
      expect(service.getNotification()).toBeTruthy();
      
      // Fast-forward 5 seconds
      tick(5000);
      
      expect(service.getNotification()).toBeNull();
    }));

    it('should reset timer when new notification replaces existing one', fakeAsync(() => {
      service.success('First notification');
      
      expect(service.getNotification()).toBeTruthy();
      
      // Fast-forward 3 seconds (notification should still be there)
      tick(3000);
      expect(service.getNotification()).toBeTruthy();
      
      // Show new notification - should reset timer
      service.error('Second notification');
      expect(service.getNotification()!.message).toBe('Second notification');
      
      // Fast-forward 3 more seconds (total 6 seconds from first notification)
      tick(3000);
      // Should still be visible because timer was reset
      expect(service.getNotification()).toBeTruthy();
      
      // Fast-forward 2 more seconds (5 seconds from second notification)
      tick(2000);
      expect(service.getNotification()).toBeNull();
    }));
  });
});
