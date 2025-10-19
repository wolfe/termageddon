import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NotificationService, Notification } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [NotificationService],
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

    it('should not auto-dismiss notification (component handles timing)', fakeAsync(() => {
      service.success('Test notification');

      expect(service.getNotification()).toBeTruthy();

      // Fast-forward 8 seconds - notification should still be there
      // because the component handles the timing, not the service
      tick(8000);

      expect(service.getNotification()).toBeTruthy();

      // Manually dismiss to clean up
      service.dismiss();
      expect(service.getNotification()).toBeNull();
    }));
  });
});
