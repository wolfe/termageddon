import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { TermDetailComponent } from './term-detail.component';
import { EntryDetailService } from '../../services/entry-detail.service';
import { PermissionService } from '../../services/permission.service';
import { NotificationService } from '../../services/notification.service';
import { GlossaryService } from '../../services/glossary.service';
import { NavigationService } from '../../services/navigation.service';
import { Entry, EntryDraft, Comment } from '../../models';

describe('TermDetailComponent', () => {
  let component: TermDetailComponent;
  let fixture: ComponentFixture<TermDetailComponent>;
  let navigationService: jasmine.SpyObj<NavigationService>;

  beforeEach(async () => {
    const navigationSpy = jasmine.createSpyObj('NavigationService', ['navigateToEntry']);
    const entryDetailSpy = jasmine.createSpyObj('EntryDetailService', [
      'loadCommentsWithPositions',
      'loadDraftHistory',
      'initializeEditContentFromLatest',
      'createNewDraft',
      'refreshAfterDraftCreated',
    ]);
    const permissionSpy = jasmine.createSpyObj('PermissionService', ['canMarkOfficial'], {
      currentUser: {
        id: 1,
        username: 'testuser',
        first_name: 'Test',
        last_name: 'User',
        is_staff: false,
        perspective_curator_for: [],
      },
    });
    permissionSpy.canMarkOfficial.and.returnValue(false);
    const notificationSpy = jasmine.createSpyObj('NotificationService', ['success', 'error']);
    const glossarySpy = jasmine.createSpyObj('GlossaryService', ['getEntries', 'endorseEntry']);

    // Mock the service methods to return observables (paginated responses)
    entryDetailSpy.loadCommentsWithPositions.and.returnValue(of({ count: 0, next: null, previous: null, results: [] }));
    entryDetailSpy.loadDraftHistory.and.returnValue(of({ count: 0, next: null, previous: null, results: [] }));
    glossarySpy.getEntries.and.returnValue(of({ results: [] }));

    await TestBed.configureTestingModule({
      imports: [TermDetailComponent, HttpClientTestingModule],
      providers: [
        { provide: EntryDetailService, useValue: entryDetailSpy },
        { provide: PermissionService, useValue: permissionSpy },
        { provide: NotificationService, useValue: notificationSpy },
        { provide: GlossaryService, useValue: glossarySpy },
        { provide: NavigationService, useValue: navigationSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TermDetailComponent);
    component = fixture.componentInstance;
    navigationService = TestBed.inject(NavigationService) as jasmine.SpyObj<NavigationService>;

    // Set up mock entry
    component.entry = {
      id: 1,
      term: {
        id: 1,
        text: 'Test Term',
        text_normalized: 'test term',
        is_official: false,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      },
      perspective: {
        id: 1,
        name: 'Test Perspective',
        description: 'Test Description',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      },
      active_draft: undefined,
      is_official: false,
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
    } as Entry;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('entry link navigation', () => {
    beforeEach(() => {
      fixture.detectChanges();
      component.ngAfterViewInit();
    });

    it('should navigate to entry when entry link is clicked', () => {
      // Create a mock link element with data-entry-id attribute
      const mockLink = document.createElement('a');
      mockLink.setAttribute('data-entry-id', '123');
      mockLink.href = '#entry-123';
      mockLink.textContent = 'Test Entry';

      // Create a mock click event
      const mockEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      });

      // Mock the event target
      Object.defineProperty(mockEvent, 'target', {
        value: mockLink,
        writable: false,
      });

      // Spy on preventDefault
      spyOn(mockEvent, 'preventDefault');

      // Trigger the click event
      document.dispatchEvent(mockEvent);

      // Verify preventDefault was called
      expect(mockEvent.preventDefault).toHaveBeenCalled();

      // Verify navigation service was called with correct entry ID
      expect(navigationService.navigateToEntry).toHaveBeenCalledWith(123);
    });

    it('should not navigate when non-entry link is clicked', () => {
      // Create a mock regular link element without data-entry-id
      const mockLink = document.createElement('a');
      mockLink.href = 'https://example.com';
      mockLink.textContent = 'External Link';

      // Create a mock click event
      const mockEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      });

      // Mock the event target
      Object.defineProperty(mockEvent, 'target', {
        value: mockLink,
        writable: false,
      });

      // Spy on preventDefault
      spyOn(mockEvent, 'preventDefault');

      // Trigger the click event
      document.dispatchEvent(mockEvent);

      // Verify preventDefault was not called
      expect(mockEvent.preventDefault).not.toHaveBeenCalled();

      // Verify navigation service was not called
      expect(navigationService.navigateToEntry).not.toHaveBeenCalled();
    });

    it('should not navigate when non-link element is clicked', () => {
      // Create a mock div element
      const mockDiv = document.createElement('div');
      mockDiv.textContent = 'Some content';

      // Create a mock click event
      const mockEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      });

      // Mock the event target
      Object.defineProperty(mockEvent, 'target', {
        value: mockDiv,
        writable: false,
      });

      // Spy on preventDefault
      spyOn(mockEvent, 'preventDefault');

      // Trigger the click event
      document.dispatchEvent(mockEvent);

      // Verify preventDefault was not called
      expect(mockEvent.preventDefault).not.toHaveBeenCalled();

      // Verify navigation service was not called
      expect(navigationService.navigateToEntry).not.toHaveBeenCalled();
    });

    it('should handle invalid entry ID gracefully', () => {
      // Create a mock link element with invalid data-entry-id
      const mockLink = document.createElement('a');
      mockLink.setAttribute('data-entry-id', 'invalid');
      mockLink.href = '#entry-invalid';
      mockLink.textContent = 'Invalid Entry';

      // Create a mock click event
      const mockEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      });

      // Mock the event target
      Object.defineProperty(mockEvent, 'target', {
        value: mockLink,
        writable: false,
      });

      // Spy on preventDefault
      spyOn(mockEvent, 'preventDefault');

      // Trigger the click event
      document.dispatchEvent(mockEvent);

      // Verify preventDefault was called
      expect(mockEvent.preventDefault).toHaveBeenCalled();

      // Verify navigation service was not called (because entry ID is invalid)
      expect(navigationService.navigateToEntry).not.toHaveBeenCalled();
    });
  });

  afterEach(() => {
    // Clean up event listeners
    component.ngOnDestroy();
  });
});
