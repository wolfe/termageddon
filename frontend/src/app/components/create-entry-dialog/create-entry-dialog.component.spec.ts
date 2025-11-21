import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';

import { CreateEntryDialogComponent } from './create-entry-dialog.component';
import { GlossaryService } from '../../services/glossary.service';
import { NavigationService } from '../../services/navigation.service';
import { AuthService } from '../../services/auth.service';

describe('CreateEntryDialogComponent', () => {
  let component: CreateEntryDialogComponent;
  let fixture: ComponentFixture<CreateEntryDialogComponent>;
  let mockGlossaryService: jasmine.SpyObj<GlossaryService>;
  let mockNavigationService: jasmine.SpyObj<NavigationService>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    const glossaryServiceSpy = jasmine.createSpyObj('GlossaryService', [
      'getPerspectives',
      'getUsers',
      'lookupOrCreateEntry',
    ]);
    const navigationServiceSpy = jasmine.createSpyObj('NavigationService', [
      'navigateToPanelWithEntry',
      'determineTargetPanel',
    ]);
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['getCurrentUser']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate', 'navigateByUrl']);

    await TestBed.configureTestingModule({
      imports: [CreateEntryDialogComponent],
      providers: [
        { provide: GlossaryService, useValue: glossaryServiceSpy },
        { provide: NavigationService, useValue: navigationServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateEntryDialogComponent);
    component = fixture.componentInstance;
    mockGlossaryService = TestBed.inject(GlossaryService) as jasmine.SpyObj<GlossaryService>;
    mockNavigationService = TestBed.inject(NavigationService) as jasmine.SpyObj<NavigationService>;
    mockAuthService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;

    // Setup default mocks
    mockGlossaryService.getPerspectives.and.returnValue(
      of({ count: 0, next: null, previous: null, results: [] })
    );
    mockGlossaryService.getUsers.and.returnValue(of({ count: 0, next: null, previous: null, results: [] }));
    mockAuthService.getCurrentUser.and.returnValue(
      of({
        id: 1,
        username: 'testuser',
        first_name: 'Test',
        last_name: 'User',
        is_staff: false,
        perspective_curator_for: [],
      })
    );
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should navigate to /entry/new for new entries', () => {
    component.selectedTermText = 'Brand New Term';
    component.selectedPerspectiveId = 1;
    component.perspectiveStatuses[1] = {
      hasPublishedDraft: false,
      hasUnpublishedDraft: false,
      unpublishedDraftAuthorId: null,
      unpublishedDraftAuthorName: null,
    };

    component.onSave();

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/entry/new'], {
      queryParams: {
        term: 'Brand New Term',
        perspective: 1,
      },
    });
  });

  it('should use lookupOrCreateEntry for existing entries', () => {
    const mockEntry = {
      id: 5,
      term: {
        id: 1,
        text: 'Existing Term',
        text_normalized: 'existing term',
        is_official: false,
        created_at: '',
        updated_at: '',
      },
      perspective: { id: 1, name: 'Test', description: '', created_at: '', updated_at: '' },
      is_official: false,
      created_at: '',
      updated_at: '',
    };

    mockGlossaryService.lookupOrCreateEntry.and.returnValue(
      of({
        entry_id: 5,
        has_published_draft: true,
        has_unpublished_draft: false,
        unpublished_draft_author_id: null,
        is_new: false,
        term: mockEntry.term,
        perspective: mockEntry.perspective,
        entry: mockEntry,
      })
    );

    component.selectedTermId = 1;
    component.selectedTermText = 'Existing Term';
    component.selectedPerspectiveId = 1;
    component.perspectiveStatuses[1] = {
      hasPublishedDraft: true,
      hasUnpublishedDraft: false,
      unpublishedDraftAuthorId: null,
      unpublishedDraftAuthorName: null,
    };

    component.onSave();

    expect(mockGlossaryService.lookupOrCreateEntry).toHaveBeenCalled();
    expect(mockRouter.navigate).not.toHaveBeenCalledWith(['/entry/new'], jasmine.any(Object));
  });

  it('should show validation error when term text is empty', () => {
    component.selectedTermText = '';
    component.selectedPerspectiveId = 1;

    component.onSave();

    expect(component.error).toBe('Please enter a term and select a perspective');
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });

  it('should show validation error when perspective is not selected', () => {
    component.selectedTermText = 'Some Term';
    component.selectedPerspectiveId = null;

    component.onSave();

    expect(component.error).toBe('Please enter a term and select a perspective');
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });

  it('should emit entryCreated event when existing entry is found', () => {
    const mockEntry = {
      id: 5,
      term: {
        id: 1,
        text: 'Existing Term',
        text_normalized: 'existing term',
        is_official: false,
        created_at: '',
        updated_at: '',
      },
      perspective: { id: 1, name: 'Test', description: '', created_at: '', updated_at: '' },
      is_official: false,
      created_at: '',
      updated_at: '',
    };

    mockGlossaryService.lookupOrCreateEntry.and.returnValue(
      of({
        entry_id: 5,
        has_published_draft: true,
        has_unpublished_draft: false,
        unpublished_draft_author_id: null,
        is_new: false,
        term: mockEntry.term,
        perspective: mockEntry.perspective,
        entry: mockEntry,
      })
    );

    spyOn(component.entryCreated, 'emit');

    component.selectedTermId = 1;
    component.selectedTermText = 'Existing Term';
    component.selectedPerspectiveId = 1;
    component.perspectiveStatuses[1] = {
      hasPublishedDraft: true,
      hasUnpublishedDraft: false,
      unpublishedDraftAuthorId: null,
      unpublishedDraftAuthorName: null,
    };

    component.onSave();

    expect(component.entryCreated.emit).toHaveBeenCalledWith(mockEntry);
  });

  it('should emit close event after successful save', () => {
    spyOn(component.close, 'emit');

    component.selectedTermText = 'Brand New Term';
    component.selectedPerspectiveId = 1;
    component.perspectiveStatuses[1] = {
      hasPublishedDraft: false,
      hasUnpublishedDraft: false,
      unpublishedDraftAuthorId: null,
      unpublishedDraftAuthorName: null,
    };

    component.onSave();

    expect(component.close.emit).toHaveBeenCalled();
  });

  it('should reset form after successful save', () => {
    component.selectedTermText = 'Brand New Term';
    component.selectedPerspectiveId = 1;
    component.perspectiveStatuses[1] = {
      hasPublishedDraft: false,
      hasUnpublishedDraft: false,
      unpublishedDraftAuthorId: null,
      unpublishedDraftAuthorName: null,
    };

    component.onSave();

    expect(component.selectedTermText).toBe('');
    expect(component.selectedTermId).toBeNull();
    expect(component.selectedPerspectiveId).toBeNull();
    expect(component.error).toBeNull();
  });

  it('should handle lookupOrCreateEntry error gracefully', () => {
    spyOn(component.close, 'emit');

    mockGlossaryService.lookupOrCreateEntry.and.returnValue(
      of({
        entry_id: 5,
        has_published_draft: true,
        has_unpublished_draft: false,
        unpublished_draft_author_id: null,
        is_new: false,
        term: {
          id: 1,
          text: 'Existing Term',
          text_normalized: 'existing term',
          is_official: false,
          created_at: '',
          updated_at: '',
        },
        perspective: { id: 1, name: 'Test', description: '', created_at: '', updated_at: '' },
        entry: undefined,
      })
    );

    component.selectedTermId = 1;
    component.selectedTermText = 'Existing Term';
    component.selectedPerspectiveId = 1;
    component.perspectiveStatuses[1] = {
      hasPublishedDraft: true,
      hasUnpublishedDraft: false,
      unpublishedDraftAuthorId: null,
      unpublishedDraftAuthorName: null,
    };

    component.onSave();

    expect(component.isLoading).toBeFalse();
    expect(component.close.emit).toHaveBeenCalled();
  });

  it('should handle lookupOrCreateEntry service error', () => {
    const errorResponse = {
      entry_id: null,
      has_published_draft: false,
      has_unpublished_draft: false,
      unpublished_draft_author_id: null,
      is_new: false,
      term: {
        id: 1,
        text: 'Existing Term',
        text_normalized: 'existing term',
        is_official: false,
        created_at: '',
        updated_at: '',
      },
      perspective: { id: 1, name: 'Test', description: '', created_at: '', updated_at: '' },
      entry: undefined,
    };
    mockGlossaryService.lookupOrCreateEntry.and.returnValue(of(errorResponse));

    component.selectedTermId = 1;
    component.selectedTermText = 'Existing Term';
    component.selectedPerspectiveId = 1;
    component.perspectiveStatuses[1] = {
      hasPublishedDraft: true,
      hasUnpublishedDraft: false,
      unpublishedDraftAuthorId: null,
      unpublishedDraftAuthorName: null,
    };

    component.onSave();

    expect(component.isLoading).toBeFalse();
  });

  it('should load perspectives and users on init', () => {
    const mockPerspectives = {
      count: 2,
      next: null,
      previous: null,
      results: [
        { id: 1, name: 'Perspective 1', description: '', created_at: '', updated_at: '' },
        { id: 2, name: 'Perspective 2', description: '', created_at: '', updated_at: '' },
      ],
    };
    const mockUsers = [
      {
        id: 1,
        username: 'user1',
        first_name: 'User',
        last_name: 'One',
        is_staff: false,
        perspective_curator_for: [],
      },
      {
        id: 2,
        username: 'user2',
        first_name: 'User',
        last_name: 'Two',
        is_staff: false,
        perspective_curator_for: [],
      },
    ];

    mockGlossaryService.getPerspectives.and.returnValue(of(mockPerspectives));
    mockGlossaryService.getUsers.and.returnValue(of({ count: mockUsers.length, next: null, previous: null, results: mockUsers }));

    component.ngOnInit();

    expect(component.perspectives).toEqual(mockPerspectives.results);
    expect(component.users).toEqual(mockUsers);
    expect(component.perspectiveStatuses[1]).toBeDefined();
    expect(component.perspectiveStatuses[2]).toBeDefined();
  });

  it('should update perspective statuses when term is selected', () => {
    const mockResponse = {
      entry_id: 5,
      has_published_draft: true,
      has_unpublished_draft: false,
      unpublished_draft_author_id: null,
      is_new: false,
      term: {
        id: 1,
        text: 'Test Term',
        text_normalized: 'test term',
        is_official: false,
        created_at: '',
        updated_at: '',
      },
      perspective: { id: 1, name: 'Test', description: '', created_at: '', updated_at: '' },
      entry: undefined,
    };

    mockGlossaryService.lookupOrCreateEntry.and.returnValue(of(mockResponse));

    component.selectedTermId = 1;
    component.selectedTermText = 'Test Term';
    component.selectedPerspectiveId = 1;

    component.onTermSelected({ termId: 1, termText: 'Test Term' });

    expect(mockGlossaryService.lookupOrCreateEntry).toHaveBeenCalledWith({
      term_id: 1,
      perspective_id: 1,
    });
  });

  it('should update perspective statuses when perspective is selected', () => {
    const mockResponse = {
      entry_id: 5,
      has_published_draft: true,
      has_unpublished_draft: false,
      unpublished_draft_author_id: null,
      is_new: false,
      term: {
        id: 1,
        text: 'Test Term',
        text_normalized: 'test term',
        is_official: false,
        created_at: '',
        updated_at: '',
      },
      perspective: { id: 1, name: 'Test', description: '', created_at: '', updated_at: '' },
      entry: undefined,
    };

    mockGlossaryService.lookupOrCreateEntry.and.returnValue(of(mockResponse));

    component.selectedTermId = 1;
    component.selectedTermText = 'Test Term';
    component.selectedPerspectiveId = 1;

    component.onPerspectiveSelected();

    expect(mockGlossaryService.lookupOrCreateEntry).toHaveBeenCalledWith({
      term_id: 1,
      perspective_id: 1,
    });
  });

  it('should get correct perspective status icon', () => {
    component.perspectiveStatuses[1] = {
      hasPublishedDraft: true,
      hasUnpublishedDraft: false,
      unpublishedDraftAuthorId: null,
      unpublishedDraftAuthorName: null,
    };

    expect(component.getPerspectiveStatusIcon(1)).toBe('✓');

    component.perspectiveStatuses[1] = {
      hasPublishedDraft: false,
      hasUnpublishedDraft: true,
      unpublishedDraftAuthorId: 1,
      unpublishedDraftAuthorName: 'testuser',
    };

    expect(component.getPerspectiveStatusIcon(1)).toBe('📝');

    component.perspectiveStatuses[1] = {
      hasPublishedDraft: false,
      hasUnpublishedDraft: false,
      unpublishedDraftAuthorId: null,
      unpublishedDraftAuthorName: null,
    };

    expect(component.getPerspectiveStatusIcon(1)).toBe('');
  });

  it('should get correct perspective status tooltip', () => {
    component.currentUser = {
      id: 1,
      username: 'testuser',
      first_name: 'Test',
      last_name: 'User',
      is_staff: false,
      perspective_curator_for: [],
    };

    component.perspectiveStatuses[1] = {
      hasPublishedDraft: true,
      hasUnpublishedDraft: false,
      unpublishedDraftAuthorId: null,
      unpublishedDraftAuthorName: null,
    };

    expect(component.getPerspectiveStatusTooltip(1)).toBe('Published entry exists');

    component.perspectiveStatuses[1] = {
      hasPublishedDraft: false,
      hasUnpublishedDraft: true,
      unpublishedDraftAuthorId: 1,
      unpublishedDraftAuthorName: 'testuser',
    };

    expect(component.getPerspectiveStatusTooltip(1)).toBe('You have a draft in progress');

    component.perspectiveStatuses[1] = {
      hasPublishedDraft: false,
      hasUnpublishedDraft: true,
      unpublishedDraftAuthorId: 2,
      unpublishedDraftAuthorName: 'otheruser',
    };

    expect(component.getPerspectiveStatusTooltip(1)).toBe('Draft in progress by otheruser');
  });

  it('should get correct button text', () => {
    component.selectedTermId = 1;
    component.selectedPerspectiveId = 1;

    component.perspectiveStatuses[1] = {
      hasPublishedDraft: true,
      hasUnpublishedDraft: false,
      unpublishedDraftAuthorId: null,
      unpublishedDraftAuthorName: null,
    };

    expect(component.getButtonText()).toBe('View Entry');

    component.perspectiveStatuses[1] = {
      hasPublishedDraft: false,
      hasUnpublishedDraft: true,
      unpublishedDraftAuthorId: 1,
      unpublishedDraftAuthorName: 'testuser',
    };

    expect(component.getButtonText()).toBe('View Entry');

    component.perspectiveStatuses[1] = {
      hasPublishedDraft: false,
      hasUnpublishedDraft: false,
      unpublishedDraftAuthorId: null,
      unpublishedDraftAuthorName: null,
    };

    expect(component.getButtonText()).toBe('Create Entry');
  });

  it('should reset form and emit close on onClose', () => {
    spyOn(component.close, 'emit');
    component.selectedTermText = 'Test Term';
    component.selectedTermId = 1;
    component.selectedPerspectiveId = 1;
    component.error = 'Some error';

    component.onClose();

    expect(component.selectedTermText).toBe('');
    expect(component.selectedTermId).toBeNull();
    expect(component.selectedPerspectiveId).toBeNull();
    expect(component.error).toBeNull();
    expect(component.close.emit).toHaveBeenCalled();
  });
});
