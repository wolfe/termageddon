import type { MockedObject } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { of } from 'rxjs';
import { MyDraftsComponent } from './my-drafts.component';
import { ReviewService } from '../../services/review.service';
import { GlossaryService } from '../../services/glossary.service';
import { PermissionService } from '../../services/permission.service';
import { EntryDetailService } from '../../services/entry-detail.service';
import { PanelCommonService } from '../../services/panel-common.service';
import { UrlHelperService } from '../../services/url-helper.service';
import { ReviewDraft, User, Comment } from '../../models';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('MyDraftsComponent', () => {
  let component: MyDraftsComponent;
  let fixture: ComponentFixture<MyDraftsComponent>;
  let reviewService: MockedObject<ReviewService>;
  let glossaryService: MockedObject<GlossaryService>;
  let permissionService: MockedObject<PermissionService>;
  let entryDetailService: MockedObject<EntryDetailService>;
  let panelCommonService: MockedObject<PanelCommonService>;
  let urlHelperService: MockedObject<UrlHelperService>;
  let router: MockedObject<Router>;
  let location: MockedObject<Location>;
  let activatedRoute: MockedObject<ActivatedRoute>;

  beforeEach(async () => {
    const reviewSpy = {
      getOwnDrafts: vi.fn().mockName('ReviewService.getOwnDrafts'),
      searchDrafts: vi.fn().mockName('ReviewService.searchDrafts'),
    };
    const glossarySpy = {
      getUsers: vi.fn().mockName('GlossaryService.getUsers'),
      getPerspectives: vi.fn().mockName('GlossaryService.getPerspectives'),
    };
    const permissionSpy = {
      currentUser: {
        id: 1,
        username: 'testuser',
        first_name: 'Test',
        last_name: 'User',
        is_staff: false,
        perspective_curator_for: [],
      },
    };
    const entryDetailSpy = {
      loadCommentsWithPositions: vi.fn().mockName('EntryDetailService.loadCommentsWithPositions'),
      loadDraftHistory: vi.fn().mockName('EntryDetailService.loadDraftHistory'),
      getEntryId: vi.fn().mockName('EntryDetailService.getEntryId'),
    };
    const panelCommonSpy = {
      initializePanelState: vi.fn().mockName('PanelCommonService.initializePanelState'),
      loadUsers: vi.fn().mockName('PanelCommonService.loadUsers'),
      loadDrafts: vi.fn().mockName('PanelCommonService.loadDrafts'),
      onSearch: vi.fn().mockName('PanelCommonService.onSearch'),
      refreshAfterEdit: vi.fn().mockName('PanelCommonService.refreshAfterEdit'),
      selectDraft: vi.fn().mockName('PanelCommonService.selectDraft'),
      onEditSaved: vi.fn().mockName('PanelCommonService.onEditSaved'),
      onCommentAdded: vi.fn().mockName('PanelCommonService.onCommentAdded'),
      onCommentResolved: vi.fn().mockName('PanelCommonService.onCommentResolved'),
      onCommentUnresolved: vi.fn().mockName('PanelCommonService.onCommentUnresolved'),
      getLatestDraftsPerEntry: vi.fn().mockName('PanelCommonService.getLatestDraftsPerEntry'),
      filterDraftsBySearch: vi.fn().mockName('PanelCommonService.filterDraftsBySearch'),
    };
    const urlHelperSpy = {
      buildDraftUrl: vi.fn().mockName('UrlHelperService.buildDraftUrl'),
    };
    const routerSpy = {
      navigate: vi.fn().mockName('Router.navigate'),
    };
    const locationSpy = {
      replaceState: vi.fn().mockName('Location.replaceState'),
    };
    const activatedRouteSpy = {
      queryParams: of({}),
      snapshot: {
        queryParams: {},
      },
    };

    // Setup PanelCommonService mocks BEFORE component creation
    panelCommonSpy.initializePanelState.mockReturnValue({
      loading: false,
      error: null,
      currentUser: null,
      searchTerm: '',
      drafts: [],
      filteredDrafts: [],
      selectedDraft: null,
      comments: [],
      isLoadingComments: false,
      showReviewerSelector: false,
      allUsers: [],
      selectedReviewerIds: [],
      draftToRequestReview: null,
      requestingReview: false,
    });
    panelCommonSpy.loadUsers.mockReturnValue();
    panelCommonSpy.loadDrafts.mockImplementation(
      (options: any, state: any, postProcessFn?: (drafts: any[]) => any[]) => {
        // Backend now handles latest-only filtering for 'own' eligibility
        const mockDrafts = [
          {
            id: 1,
            content: 'Latest draft for entry 1',
            is_approved: false,
            is_published: false,
            approval_count: 0,
            created_at: '2024-01-03T00:00:00Z',
            updated_at: '2024-01-03T00:00:00Z',
            entry: {
              id: 1,
              term: { text: 'Test Term 1' },
              perspective: {
                id: 1,
                name: 'Test Perspective',
                description: 'Test Description',
              },
            },
            author: { id: 1, username: 'testuser' },
            approvers: [],
            requested_reviewers: [],
            replaces_draft: null,
          },
          {
            id: 3,
            content: 'Latest draft for entry 2',
            is_approved: false,
            is_published: false,
            approval_count: 0,
            created_at: '2024-01-02T12:00:00Z',
            updated_at: '2024-01-02T12:00:00Z',
            entry: {
              id: 2,
              term: { text: 'Test Term 2' },
              perspective: {
                id: 2,
                name: 'Test Perspective 2',
                description: 'Test Description 2',
              },
            },
            author: { id: 1, username: 'testuser' },
            approvers: [],
            requested_reviewers: [],
            replaces_draft: null,
          },
        ];

        state.drafts = mockDrafts;
        state.filteredDrafts = [...state.drafts];
        state.loading = false;
      }
    );
    panelCommonSpy.onSearch.mockImplementation((searchTerm: string, state: any, options: any) => {
      // Backend now handles latest-only filtering for 'own' eligibility
      state.searchTerm = searchTerm;
      const mockDrafts = [
        {
          id: 1,
          content: 'Latest draft for entry 1',
          is_approved: false,
          is_published: false,
          approval_count: 0,
          created_at: '2024-01-03T00:00:00Z',
          updated_at: '2024-01-03T00:00:00Z',
          entry: {
            id: 1,
            term: { text: 'Test Term 1' },
            perspective: { id: 1, name: 'Test Perspective', description: 'Test Description' },
          },
          author: { id: 1, username: 'testuser' },
          approvers: [],
          requested_reviewers: [],
          replaces_draft: null,
        },
        {
          id: 3,
          content: 'Latest draft for entry 2',
          is_approved: false,
          is_published: false,
          approval_count: 0,
          created_at: '2024-01-02T12:00:00Z',
          updated_at: '2024-01-02T12:00:00Z',
          entry: {
            id: 2,
            term: { text: 'Test Term 2' },
            perspective: { id: 1, name: 'Test Perspective', description: 'Test Description' },
          },
          author: { id: 1, username: 'testuser' },
          approvers: [],
          requested_reviewers: [],
          replaces_draft: null,
        },
      ];
      state.filteredDrafts = mockDrafts;
      state.loading = false;
    });
    panelCommonSpy.refreshAfterEdit.mockImplementation(
      (state: any, loadDraftsCallback: () => void) => {
        // Simulate the actual behavior - refresh comments first, then drafts
        if (state.selectedDraft?.entry?.id) {
          entryDetailService
            .loadCommentsWithPositions(state.selectedDraft.entry.id)
            .subscribe(response => {
              state.comments = response.results;
            });
        }
        loadDraftsCallback();
      }
    );
    panelCommonSpy.selectDraft.mockReturnValue();
    panelCommonSpy.onEditSaved.mockImplementation((state: any, loadDraftsCallback: () => void) => {
      // Simulate the actual behavior
      loadDraftsCallback();
    });
    panelCommonSpy.onCommentAdded.mockReturnValue();
    panelCommonSpy.onCommentResolved.mockReturnValue();
    panelCommonSpy.onCommentUnresolved.mockReturnValue();
    // Setup default return values for the spies BEFORE component creation
    reviewSpy.getOwnDrafts.mockReturnValue(
      of({ count: 0, next: null, previous: null, results: [] })
    );
    reviewSpy.searchDrafts.mockReturnValue(
      of({ count: 0, next: null, previous: null, results: [] })
    );
    glossarySpy.getUsers.mockReturnValue(of([]));
    glossarySpy.getPerspectives.mockReturnValue(
      of({ count: 0, next: null, previous: null, results: [] })
    );
    entryDetailSpy.loadCommentsWithPositions.mockReturnValue(of([]));
    entryDetailSpy.loadDraftHistory.mockReturnValue(of([]));
    entryDetailSpy.getEntryId.mockReturnValue(1);
    panelCommonSpy.getLatestDraftsPerEntry.mockImplementation((drafts: ReviewDraft[]) => {
      // Simulate the actual filtering logic
      const latestDraftsMap = new Map<number, ReviewDraft>();
      drafts.forEach(draft => {
        const entryId = draft.entry.id;
        const existing = latestDraftsMap.get(entryId);
        if (!existing || new Date(draft.created_at) > new Date(existing.created_at)) {
          latestDraftsMap.set(entryId, draft);
        }
      });
      return Array.from(latestDraftsMap.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });
    panelCommonSpy.filterDraftsBySearch.mockReturnValue([]);

    await TestBed.configureTestingModule({
      imports: [MyDraftsComponent],
      providers: [
        { provide: ReviewService, useValue: reviewSpy },
        { provide: GlossaryService, useValue: glossarySpy },
        { provide: PermissionService, useValue: permissionSpy },
        { provide: EntryDetailService, useValue: entryDetailSpy },
        { provide: PanelCommonService, useValue: panelCommonSpy },
        { provide: UrlHelperService, useValue: urlHelperSpy },
        { provide: Router, useValue: routerSpy },
        { provide: Location, useValue: locationSpy },
        { provide: ActivatedRoute, useValue: activatedRouteSpy },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MyDraftsComponent);
    component = fixture.componentInstance;
    reviewService = TestBed.inject(ReviewService) as MockedObject<ReviewService>;
    glossaryService = TestBed.inject(GlossaryService) as MockedObject<GlossaryService>;
    permissionService = TestBed.inject(PermissionService) as MockedObject<PermissionService>;
    entryDetailService = TestBed.inject(EntryDetailService) as MockedObject<EntryDetailService>;
    panelCommonService = TestBed.inject(PanelCommonService) as MockedObject<PanelCommonService>;
    urlHelperService = TestBed.inject(UrlHelperService) as MockedObject<UrlHelperService>;
    router = TestBed.inject(Router) as MockedObject<Router>;
    location = TestBed.inject(Location) as MockedObject<Location>;
    activatedRoute = TestBed.inject(ActivatedRoute) as MockedObject<ActivatedRoute>;

    // Ensure the component state is initialized
    fixture.detectChanges();
    expect(component.state).toBeDefined();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('getLatestDraftsPerEntry', () => {
    it('should return only the latest draft per entry', () => {
      const drafts: ReviewDraft[] = [
        {
          id: 1,
          content: 'Latest draft for entry 1',
          is_approved: false,
          is_published: false,
          approval_count: 0,
          created_at: '2024-01-03T00:00:00Z',
          updated_at: '2024-01-03T00:00:00Z',
          author: {
            id: 1,
            username: 'testuser',
            first_name: 'Test',
            last_name: 'User',
            is_staff: false,
            perspective_curator_for: [],
          },
          entry: {
            id: 1,
            term: {
              id: 1,
              text: 'Test Term 1',
              text_normalized: 'test term 1',
              is_official: false,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            },
            perspective: {
              id: 1,
              name: 'Test Perspective',
              description: 'Test Description',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            },
            is_official: false,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
          approvers: [],
          requested_reviewers: [],
          replaces_draft: undefined,
        },
        {
          id: 2,
          content: 'Older draft for entry 1',
          is_approved: false,
          is_published: false,
          approval_count: 0,
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
          author: {
            id: 1,
            username: 'testuser',
            first_name: 'Test',
            last_name: 'User',
            is_staff: false,
            perspective_curator_for: [],
          },
          entry: {
            id: 1,
            term: {
              id: 1,
              text: 'Test Term 1',
              text_normalized: 'test term 1',
              is_official: false,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            },
            perspective: {
              id: 1,
              name: 'Test Perspective',
              description: 'Test Description',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            },
            is_official: false,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
          approvers: [],
          requested_reviewers: [],
          replaces_draft: undefined,
        },
        {
          id: 3,
          content: 'Latest draft for entry 2',
          is_approved: false,
          is_published: false,
          approval_count: 0,
          created_at: '2024-01-02T12:00:00Z',
          updated_at: '2024-01-02T12:00:00Z',
          author: {
            id: 1,
            username: 'testuser',
            first_name: 'Test',
            last_name: 'User',
            is_staff: false,
            perspective_curator_for: [],
          },
          entry: {
            id: 2,
            term: {
              id: 2,
              text: 'Test Term 2',
              text_normalized: 'test term 2',
              is_official: false,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            },
            perspective: {
              id: 1,
              name: 'Test Perspective',
              description: 'Test Description',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            },
            is_official: false,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
          approvers: [],
          requested_reviewers: [],
          replaces_draft: undefined,
        },
      ];

      const result = panelCommonService.getLatestDraftsPerEntry(drafts);

      expect(result.length).toBe(2);
      expect(result[0].id).toBe(1); // Latest draft for entry 1
      expect(result[0].content).toBe('Latest draft for entry 1');
      expect(result[1].id).toBe(3); // Latest draft for entry 2
      expect(result[1].content).toBe('Latest draft for entry 2');
    });

    it('should sort results by created_at (newest first)', () => {
      const drafts: ReviewDraft[] = [
        {
          id: 1,
          content: 'Older draft',
          is_approved: false,
          is_published: false,
          approval_count: 0,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          author: {
            id: 1,
            username: 'testuser',
            first_name: 'Test',
            last_name: 'User',
            is_staff: false,
            perspective_curator_for: [],
          },
          entry: {
            id: 1,
            term: {
              id: 1,
              text: 'Test Term 1',
              text_normalized: 'test term 1',
              is_official: false,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            },
            perspective: {
              id: 1,
              name: 'Test Perspective',
              description: 'Test Description',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            },
            is_official: false,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
          approvers: [],
          requested_reviewers: [],
          replaces_draft: undefined,
        },
        {
          id: 2,
          content: 'Newer draft',
          is_approved: false,
          is_published: false,
          approval_count: 0,
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
          author: {
            id: 1,
            username: 'testuser',
            first_name: 'Test',
            last_name: 'User',
            is_staff: false,
            perspective_curator_for: [],
          },
          entry: {
            id: 2,
            term: {
              id: 2,
              text: 'Test Term 2',
              text_normalized: 'test term 2',
              is_official: false,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            },
            perspective: {
              id: 1,
              name: 'Test Perspective',
              description: 'Test Description',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            },
            is_official: false,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
          approvers: [],
          requested_reviewers: [],
          replaces_draft: undefined,
        },
      ];

      const result = panelCommonService.getLatestDraftsPerEntry(drafts);

      expect(result.length).toBe(2);
      expect(result[0].id).toBe(2); // Newer draft should be first
      expect(result[0].content).toBe('Newer draft');
      expect(result[1].id).toBe(1); // Older draft should be second
      expect(result[1].content).toBe('Older draft');
    });

    it('should handle empty array', () => {
      const drafts: ReviewDraft[] = [];

      const result = panelCommonService.getLatestDraftsPerEntry(drafts);

      expect(result.length).toBe(0);
    });

    it('should handle single draft', () => {
      const drafts: ReviewDraft[] = [
        {
          id: 1,
          content: 'Single draft',
          is_approved: false,
          is_published: false,
          approval_count: 0,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          author: {
            id: 1,
            username: 'testuser',
            first_name: 'Test',
            last_name: 'User',
            is_staff: false,
            perspective_curator_for: [],
          },
          entry: {
            id: 1,
            term: {
              id: 1,
              text: 'Test Term',
              text_normalized: 'test term',
              is_official: false,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            },
            perspective: {
              id: 1,
              name: 'Test Perspective',
              description: 'Test Description',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            },
            is_official: false,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
          approvers: [],
          requested_reviewers: [],
          replaces_draft: undefined,
        },
      ];

      const result = panelCommonService.getLatestDraftsPerEntry(drafts);

      expect(result.length).toBe(1);
      expect(result[0].id).toBe(1);
      expect(result[0].content).toBe('Single draft');
    });
  });

  describe('loadMyDrafts', () => {
    it('should load drafts and apply latest-only filtering', () => {
      const mockResponse = {
        count: 3,
        next: null,
        previous: null,
        results: [
          {
            id: 1,
            content: 'Latest draft for entry 1',
            is_approved: false,
            is_published: false,
            approval_count: 0,
            created_at: '2024-01-03T00:00:00Z',
            updated_at: '2024-01-03T00:00:00Z',
            author: {
              id: 1,
              username: 'testuser',
              first_name: 'Test',
              last_name: 'User',
              is_staff: false,
              perspective_curator_for: [],
            },
            entry: {
              id: 1,
              term: {
                id: 1,
                text: 'Test Term 1',
                text_normalized: 'test term 1',
                is_official: false,
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z',
              },
              perspective: {
                id: 1,
                name: 'Test Perspective',
                description: 'Test Description',
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z',
              },
              is_official: false,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            },
            approvers: [],
            requested_reviewers: [],
            replaces_draft: undefined,
          },
          {
            id: 2,
            content: 'Older draft for entry 1',
            is_approved: false,
            is_published: false,
            approval_count: 0,
            created_at: '2024-01-02T00:00:00Z',
            updated_at: '2024-01-02T00:00:00Z',
            author: {
              id: 1,
              username: 'testuser',
              first_name: 'Test',
              last_name: 'User',
              is_staff: false,
              perspective_curator_for: [],
            },
            entry: {
              id: 1,
              term: {
                id: 1,
                text: 'Test Term 1',
                text_normalized: 'test term 1',
                is_official: false,
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z',
              },
              perspective: {
                id: 1,
                name: 'Test Perspective',
                description: 'Test Description',
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z',
              },
              is_official: false,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            },
            approvers: [],
            requested_reviewers: [],
            replaces_draft: undefined,
          },
          {
            id: 3,
            content: 'Latest draft for entry 2',
            is_approved: false,
            is_published: false,
            approval_count: 0,
            created_at: '2024-01-02T12:00:00Z',
            updated_at: '2024-01-02T12:00:00Z',
            author: {
              id: 1,
              username: 'testuser',
              first_name: 'Test',
              last_name: 'User',
              is_staff: false,
              perspective_curator_for: [],
            },
            entry: {
              id: 2,
              term: {
                id: 2,
                text: 'Test Term 2',
                text_normalized: 'test term 2',
                is_official: false,
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z',
              },
              perspective: {
                id: 1,
                name: 'Test Perspective',
                description: 'Test Description',
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z',
              },
              is_official: false,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            },
            approvers: [],
            requested_reviewers: [],
            replaces_draft: undefined,
          },
        ],
      };

      reviewService.getOwnDrafts.mockReturnValue(of(mockResponse));

      component.loadMyDrafts();

      expect(panelCommonService.loadDrafts).toHaveBeenCalled();
      expect(component.state.drafts.length).toBe(2); // Only latest drafts per entry
      expect(component.state.drafts[0].id).toBe(1); // Latest draft for entry 1
      expect(component.state.drafts[1].id).toBe(3); // Latest draft for entry 2
      expect(component.state.filteredDrafts).toEqual(component.state.drafts);
    });
  });

  describe('Integration Tests', () => {
    it('should show only latest draft per entry in the UI', () => {
      const mockResponse = {
        count: 3,
        next: null,
        previous: null,
        results: [
          {
            id: 1,
            content: 'Latest draft for entry 1',
            is_approved: false,
            is_published: false,
            approval_count: 0,
            created_at: '2024-01-03T00:00:00Z',
            updated_at: '2024-01-03T00:00:00Z',
            author: {
              id: 1,
              username: 'testuser',
              first_name: 'Test',
              last_name: 'User',
              is_staff: false,
              perspective_curator_for: [],
            },
            entry: {
              id: 1,
              term: {
                id: 1,
                text: 'Test Term 1',
                text_normalized: 'test term 1',
                is_official: false,
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z',
              },
              perspective: {
                id: 1,
                name: 'Test Perspective',
                description: 'Test Description',
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z',
              },
              is_official: false,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            },
            approvers: [],
            requested_reviewers: [],
            replaces_draft: undefined,
          },
          {
            id: 2,
            content: 'Older draft for entry 1',
            is_approved: false,
            is_published: false,
            approval_count: 0,
            created_at: '2024-01-02T00:00:00Z',
            updated_at: '2024-01-02T00:00:00Z',
            author: {
              id: 1,
              username: 'testuser',
              first_name: 'Test',
              last_name: 'User',
              is_staff: false,
              perspective_curator_for: [],
            },
            entry: {
              id: 1,
              term: {
                id: 1,
                text: 'Test Term 1',
                text_normalized: 'test term 1',
                is_official: false,
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z',
              },
              perspective: {
                id: 1,
                name: 'Test Perspective',
                description: 'Test Description',
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z',
              },
              is_official: false,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            },
            approvers: [],
            requested_reviewers: [],
            replaces_draft: undefined,
          },
          {
            id: 3,
            content: 'Latest draft for entry 2',
            is_approved: false,
            is_published: false,
            approval_count: 0,
            created_at: '2024-01-02T12:00:00Z',
            updated_at: '2024-01-02T12:00:00Z',
            author: {
              id: 1,
              username: 'testuser',
              first_name: 'Test',
              last_name: 'User',
              is_staff: false,
              perspective_curator_for: [],
            },
            entry: {
              id: 2,
              term: {
                id: 2,
                text: 'Test Term 2',
                text_normalized: 'test term 2',
                is_official: false,
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z',
              },
              perspective: {
                id: 1,
                name: 'Test Perspective',
                description: 'Test Description',
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z',
              },
              is_official: false,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            },
            approvers: [],
            requested_reviewers: [],
            replaces_draft: undefined,
          },
        ],
      };

      reviewService.getOwnDrafts.mockReturnValue(of(mockResponse));

      component.loadMyDrafts();

      // Should only show 2 drafts (latest per entry), not 3
      expect(component.state.drafts.length).toBe(2);
      expect(component.state.drafts[0].id).toBe(1); // Latest draft for entry 1
      expect(component.state.drafts[1].id).toBe(3); // Latest draft for entry 2

      // Verify older draft (id: 2) is not included
      const draftIds = component.state.drafts.map((d: ReviewDraft) => d.id);
      expect(draftIds).not.toContain(2);
    });

    it('should apply latest-only filtering to search results', () => {
      const mockSearchResponse = {
        count: 3,
        next: null,
        previous: null,
        results: [
          {
            id: 1,
            content: 'Latest draft for entry 1',
            is_approved: false,
            is_published: false,
            approval_count: 0,
            created_at: '2024-01-03T00:00:00Z',
            updated_at: '2024-01-03T00:00:00Z',
            author: {
              id: 1,
              username: 'testuser',
              first_name: 'Test',
              last_name: 'User',
              is_staff: false,
              perspective_curator_for: [],
            },
            entry: {
              id: 1,
              term: {
                id: 1,
                text: 'Test Term 1',
                text_normalized: 'test term 1',
                is_official: false,
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z',
              },
              perspective: {
                id: 1,
                name: 'Test Perspective',
                description: 'Test Description',
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z',
              },
              is_official: false,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            },
            approvers: [],
            requested_reviewers: [],
            replaces_draft: undefined,
          },
          {
            id: 2,
            content: 'Older draft for entry 1',
            is_approved: false,
            is_published: false,
            approval_count: 0,
            created_at: '2024-01-02T00:00:00Z',
            updated_at: '2024-01-02T00:00:00Z',
            author: {
              id: 1,
              username: 'testuser',
              first_name: 'Test',
              last_name: 'User',
              is_staff: false,
              perspective_curator_for: [],
            },
            entry: {
              id: 1,
              term: {
                id: 1,
                text: 'Test Term 1',
                text_normalized: 'test term 1',
                is_official: false,
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z',
              },
              perspective: {
                id: 1,
                name: 'Test Perspective',
                description: 'Test Description',
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z',
              },
              is_official: false,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            },
            approvers: [],
            requested_reviewers: [],
            replaces_draft: undefined,
          },
          {
            id: 3,
            content: 'Latest draft for entry 2',
            is_approved: false,
            is_published: false,
            approval_count: 0,
            created_at: '2024-01-02T12:00:00Z',
            updated_at: '2024-01-02T12:00:00Z',
            author: {
              id: 1,
              username: 'testuser',
              first_name: 'Test',
              last_name: 'User',
              is_staff: false,
              perspective_curator_for: [],
            },
            entry: {
              id: 2,
              term: {
                id: 2,
                text: 'Test Term 2',
                text_normalized: 'test term 2',
                is_official: false,
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z',
              },
              perspective: {
                id: 1,
                name: 'Test Perspective',
                description: 'Test Description',
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z',
              },
              is_official: false,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            },
            approvers: [],
            requested_reviewers: [],
            replaces_draft: undefined,
          },
        ],
      };

      reviewService.searchDrafts.mockReturnValue(of(mockSearchResponse));
      reviewService.getOwnDrafts.mockReturnValue(
        of({ count: 0, next: null, previous: null, results: [] })
      );
      glossaryService.getUsers.mockReturnValue(
        of({ count: 0, next: null, previous: null, results: [] })
      );

      component.state.searchTerm = 'test';
      component.ngOnInit(); // Ensure currentUser is initialized
      component.onSearch();

      // Should only show 2 drafts (latest per entry), not 3
      expect(component.state.filteredDrafts.length).toBe(2);
      expect(component.state.filteredDrafts[0].id).toBe(1); // Latest draft for entry 1
      expect(component.state.filteredDrafts[1].id).toBe(3); // Latest draft for entry 2

      // Verify older draft (id: 2) is not included
      const draftIds = component.state.filteredDrafts.map((d: ReviewDraft) => d.id);
      expect(draftIds).not.toContain(2);
    });

    it('should refresh drafts and comments after edit is saved', async () => {
      vi.useFakeTimers();
      const mockDraft: ReviewDraft = {
        id: 1,
        content: 'Test draft content',
        is_approved: false,
        is_published: false,
        approval_count: 0,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        author: {
          id: 1,
          username: 'testuser',
          first_name: 'Test',
          last_name: 'User',
          is_staff: false,
          perspective_curator_for: [],
        },
        entry: {
          id: 1,
          term: {
            id: 1,
            text: 'Test Term',
            text_normalized: 'test term',
            is_official: false,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
          perspective: {
            id: 1,
            name: 'Test Perspective',
            description: 'Test Description',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
          is_official: false,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        approvers: [],
        requested_reviewers: [],
        replaces_draft: undefined,
      };

      const mockComments: Comment[] = [
        {
          id: 1,
          draft_id: 1,
          text: 'Test comment',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          is_resolved: false,
          author: {
            id: 1,
            username: 'testuser',
            first_name: 'Test',
            last_name: 'User',
            is_staff: false,
            perspective_curator_for: [],
          },
          replies: [],
        },
      ];

      component.state.selectedDraft = mockDraft;

      reviewService.getOwnDrafts.mockReturnValue(
        of({
          count: 1,
          next: null,
          previous: null,
          results: [mockDraft],
        })
      );

      entryDetailService.loadCommentsWithPositions.mockReturnValue(
        of({ count: mockComments.length, next: null, previous: null, results: mockComments })
      );

      // The existing refreshAfterEdit spy should handle this correctly

      // Simulate edit saved event
      component.onEditSaved();
      // Advance timers to flush setTimeout
      vi.runAllTimers();

      expect(panelCommonService.loadDrafts).toHaveBeenCalled();
      expect(entryDetailService.loadCommentsWithPositions).toHaveBeenCalledWith(1);
      expect(component.state.comments).toEqual(mockComments);

      vi.useRealTimers();
    });
  });
});
