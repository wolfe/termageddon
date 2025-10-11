import { TestBed } from '@angular/core/testing';
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

  describe('Notification methods', () => {
    it('should show success notification', () => {
      const message = 'Success message';
      
      service.success(message);
      
      const notifications = service.getNotifications();
      expect(notifications.length).toBe(1);
      expect(notifications[0].message).toBe(message);
      expect(notifications[0].type).toBe('success');
      expect(notifications[0].id).toBeDefined();
    });

    it('should show error notification', () => {
      const message = 'Error message';
      
      service.error(message);
      
      const notifications = service.getNotifications();
      expect(notifications.length).toBe(1);
      expect(notifications[0].message).toBe(message);
      expect(notifications[0].type).toBe('error');
      expect(notifications[0].id).toBeDefined();
    });

    it('should show warning notification', () => {
      const message = 'Warning message';
      
      service.warning(message);
      
      const notifications = service.getNotifications();
      expect(notifications.length).toBe(1);
      expect(notifications[0].message).toBe(message);
      expect(notifications[0].type).toBe('warning');
      expect(notifications[0].id).toBeDefined();
    });

    it('should show info notification', () => {
      const message = 'Info message';
      
      service.info(message);
      
      const notifications = service.getNotifications();
      expect(notifications.length).toBe(1);
      expect(notifications[0].message).toBe(message);
      expect(notifications[0].type).toBe('info');
      expect(notifications[0].id).toBeDefined();
    });

    it('should generate unique IDs for notifications', () => {
      const id1 = service.success('First notification');
      const id2 = service.error('Second notification');
      const id3 = service.warning('Third notification');

      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
      expect(id1).not.toBe(id3);
    });

    it('should dismiss notification by ID', () => {
      const id = service.success('Test notification');
      
      expect(service.getNotifications().length).toBe(1);
      
      service.dismiss(id);
      
      expect(service.getNotifications().length).toBe(0);
    });

    it('should clear all notifications', () => {
      service.success('First notification');
      service.error('Second notification');
      
      expect(service.getNotifications().length).toBe(2);
      
      service.clear();
      
      expect(service.getNotifications().length).toBe(0);
    });
  });
});
