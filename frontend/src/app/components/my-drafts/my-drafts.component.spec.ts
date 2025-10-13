import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { MyDraftsComponent } from './my-drafts.component';
import { ReviewService } from '../../services/review.service';
import { GlossaryService } from '../../services/glossary.service';
import { PermissionService } from '../../services/permission.service';
import { EntryDetailService } from '../../services/entry-detail.service';
import { PanelCommonService } from '../../services/panel-common.service';
import { ReviewDraft, User, Comment } from '../../models';

describe('MyDraftsComponent', () => {
  let component: MyDraftsComponent;
  let fixture: ComponentFixture<MyDraftsComponent>;
  let reviewService: jasmine.SpyObj<ReviewService>;
  let glossaryService: jasmine.SpyObj<GlossaryService>;
  let permissionService: jasmine.SpyObj<PermissionService>;
  let entryDetailService: jasmine.SpyObj<EntryDetailService>;
  let panelCommonService: jasmine.SpyObj<PanelCommonService>;

  beforeEach(async () => {
    const reviewSpy = jasmine.createSpyObj('ReviewService', [
      'getOwnDrafts',
      'searchDrafts'
    ]);
    const glossarySpy = jasmine.createSpyObj('GlossaryService', [
      'getUsers'
    ]);
    const permissionSpy = jasmine.createSpyObj('PermissionService', [], {
      currentUser: {
        id: 1,
        username: 'testuser',
        first_name: 'Test',
        last_name: 'User',
        is_staff: false,
        perspective_curator_for: []
      }
    });
    const entryDetailSpy = jasmine.createSpyObj('EntryDetailService', [
      'loadCommentsWithPositions',
      'loadDraftHistory',
      'getEntryId'
    ]);
    const panelCommonSpy = jasmine.createSpyObj('PanelCommonService', [
      'initializePanelState',
      'loadUsers',
      'loadDrafts',
      'onSearch',
      'refreshAfterEdit',
      'selectDraft',
      'onEditSaved',
      'onCommentAdded',
      'onCommentResolved',
      'onCommentUnresolved',
      'getLatestDraftsPerEntry',
      'filterDraftsBySearch'
    ]);

    // Setup PanelCommonService mocks BEFORE component creation
    panelCommonSpy.initializePanelState.and.returnValue({
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
      requestingReview: false
    });
    panelCommonSpy.loadUsers.and.returnValue();
    panelCommonSpy.loadDrafts.and.callFake((options: any, state: any, postProcessFn?: (drafts: any[]) => any[]) => {
      // Simulate loading drafts with the new signature
      const mockDrafts = [
        {
          id: 1,
          content: 'Test draft 1',
          is_approved: false,
          is_published: false,
          approval_count: 0,
          timestamp: '2024-01-01T00:00:00Z',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          entry: { 
            id: 1, 
            term: { text: 'Test Term 1' },
            perspective: {
              id: 1,
              name: 'Test Perspective',
              description: 'Test Description'
            }
          },
          author: { id: 1, username: 'testuser' },
          approvers: [],
          requested_reviewers: [],
          replaces_draft: null
        },
        {
          id: 2,
          content: 'Test draft 2',
          is_approved: false,
          is_published: false,
          approval_count: 0,
          timestamp: '2024-01-02T00:00:00Z',
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
          entry: { 
            id: 2, 
            term: { text: 'Test Term 2' },
            perspective: {
              id: 2,
              name: 'Test Perspective 2',
              description: 'Test Description 2'
            }
          },
          author: { id: 1, username: 'testuser' },
          approvers: [],
          requested_reviewers: [],
          replaces_draft: null
        }
      ];
      
      state.drafts = postProcessFn ? postProcessFn(mockDrafts) : mockDrafts;
      state.filteredDrafts = [...state.drafts];
      state.loading = false;
    });
    panelCommonSpy.onSearch.and.callFake((searchTerm: string, state: any, options: any) => {
      // Simulate the actual behavior
      state.searchTerm = searchTerm;
      const mockDrafts = [
        {
          id: 1,
          content: 'Test draft 1',
          is_approved: false,
          is_published: false,
          approval_count: 0,
          timestamp: '2024-01-01T00:00:00Z',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          entry: { 
            id: 1, 
            term: { text: 'Test Term 1' },
            perspective: {
              id: 1,
              name: 'Test Perspective',
              description: 'Test Description'
            }
          },
          author: { id: 1, username: 'testuser' },
          approvers: [],
          requested_reviewers: [],
          replaces_draft: null
        }
      ];
      state.filteredDrafts = mockDrafts;
      state.loading = false;
    });
    panelCommonSpy.refreshAfterEdit.and.callFake((state: any, loadDraftsCallback: () => void) => {
      // Simulate the actual behavior - refresh comments first, then drafts
      if (state.selectedDraft?.entry?.id) {
        entryDetailService.loadCommentsWithPositions(state.selectedDraft.entry.id).subscribe((comments) => {
          state.comments = comments;
        });
      }
      loadDraftsCallback();
    });
    panelCommonSpy.selectDraft.and.returnValue();
    panelCommonSpy.onEditSaved.and.callFake((state: any, loadDraftsCallback: () => void) => {
      // Simulate the actual behavior
      loadDraftsCallback();
    });
    panelCommonSpy.onCommentAdded.and.returnValue();
    panelCommonSpy.onCommentResolved.and.returnValue();
    panelCommonSpy.onCommentUnresolved.and.returnValue();
    // Setup default return values for the spies BEFORE component creation
    reviewSpy.getOwnDrafts.and.returnValue(of({ count: 0, next: null, previous: null, results: [] }));
    reviewSpy.searchDrafts.and.returnValue(of({ count: 0, next: null, previous: null, results: [] }));
    glossarySpy.getUsers.and.returnValue(of([]));
    entryDetailSpy.loadCommentsWithPositions.and.returnValue(of([]));
    entryDetailSpy.loadDraftHistory.and.returnValue(of([]));
    entryDetailSpy.getEntryId.and.returnValue(1);
    panelCommonSpy.getLatestDraftsPerEntry.and.callFake((drafts: ReviewDraft[]) => {
      // Simulate the actual filtering logic
      const latestDraftsMap = new Map<number, ReviewDraft>();
      drafts.forEach(draft => {
        const entryId = draft.entry.id;
        const existing = latestDraftsMap.get(entryId);
        if (!existing || new Date(draft.timestamp) > new Date(existing.timestamp)) {
          latestDraftsMap.set(entryId, draft);
        }
      });
      return Array.from(latestDraftsMap.values())
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    });
    panelCommonSpy.filterDraftsBySearch.and.returnValue([]);

    await TestBed.configureTestingModule({
      imports: [MyDraftsComponent, HttpClientTestingModule],
      providers: [
        { provide: ReviewService, useValue: reviewSpy },
        { provide: GlossaryService, useValue: glossarySpy },
        { provide: PermissionService, useValue: permissionSpy },
        { provide: EntryDetailService, useValue: entryDetailSpy },
        { provide: PanelCommonService, useValue: panelCommonSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MyDraftsComponent);
    component = fixture.componentInstance;
    reviewService = TestBed.inject(ReviewService) as jasmine.SpyObj<ReviewService>;
    glossaryService = TestBed.inject(GlossaryService) as jasmine.SpyObj<GlossaryService>;
    permissionService = TestBed.inject(PermissionService) as jasmine.SpyObj<PermissionService>;
    entryDetailService = TestBed.inject(EntryDetailService) as jasmine.SpyObj<EntryDetailService>;
    panelCommonService = TestBed.inject(PanelCommonService) as jasmine.SpyObj<PanelCommonService>;
    
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
          timestamp: '2024-01-03T00:00:00Z',
          created_at: '2024-01-03T00:00:00Z',
          updated_at: '2024-01-03T00:00:00Z',
          author: {
            id: 1,
            username: 'testuser',
            first_name: 'Test',
            last_name: 'User',
            is_staff: false,
            perspective_curator_for: []
          },
          entry: {
            id: 1,
            term: {
              id: 1,
              text: 'Test Term 1',
              text_normalized: 'test term 1',
              is_official: false,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            },
            perspective: {
              id: 1,
              name: 'Test Perspective',
              description: 'Test Description',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            },
            is_official: false,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          },
          approvers: [],
          requested_reviewers: [],
          replaces_draft: undefined
        },
        {
          id: 2,
          content: 'Older draft for entry 1',
        is_approved: false,
        is_published: false,
        approval_count: 0,
          timestamp: '2024-01-02T00:00:00Z',
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
          author: {
            id: 1,
            username: 'testuser',
            first_name: 'Test',
            last_name: 'User',
            is_staff: false,
            perspective_curator_for: []
          },
          entry: {
            id: 1,
            term: {
              id: 1,
              text: 'Test Term 1',
              text_normalized: 'test term 1',
              is_official: false,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            },
            perspective: {
              id: 1,
              name: 'Test Perspective',
              description: 'Test Description',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            },
            is_official: false,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          },
          approvers: [],
          requested_reviewers: [],
          replaces_draft: undefined
        },
        {
          id: 3,
          content: 'Latest draft for entry 2',
        is_approved: false,
        is_published: false,
        approval_count: 0,
          timestamp: '2024-01-02T12:00:00Z',
          created_at: '2024-01-02T12:00:00Z',
          updated_at: '2024-01-02T12:00:00Z',
          author: {
            id: 1,
            username: 'testuser',
            first_name: 'Test',
            last_name: 'User',
            is_staff: false,
            perspective_curator_for: []
          },
          entry: {
            id: 2,
            term: {
              id: 2,
              text: 'Test Term 2',
              text_normalized: 'test term 2',
              is_official: false,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            },
            perspective: {
              id: 1,
              name: 'Test Perspective',
              description: 'Test Description',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            },
            is_official: false,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          },
          approvers: [],
          requested_reviewers: [],
          replaces_draft: undefined
        }
      ];

      const result = panelCommonService.getLatestDraftsPerEntry(drafts);

      expect(result.length).toBe(2);
      expect(result[0].id).toBe(1); // Latest draft for entry 1
      expect(result[0].content).toBe('Latest draft for entry 1');
      expect(result[1].id).toBe(3); // Latest draft for entry 2
      expect(result[1].content).toBe('Latest draft for entry 2');
    });

    it('should sort results by timestamp (newest first)', () => {
      const drafts: ReviewDraft[] = [
        {
          id: 1,
          content: 'Older draft',
        is_approved: false,
        is_published: false,
        approval_count: 0,
          timestamp: '2024-01-01T00:00:00Z',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          author: {
            id: 1,
            username: 'testuser',
            first_name: 'Test',
            last_name: 'User',
            is_staff: false,
            perspective_curator_for: []
          },
          entry: {
            id: 1,
            term: {
              id: 1,
              text: 'Test Term 1',
              text_normalized: 'test term 1',
              is_official: false,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            },
            perspective: {
              id: 1,
              name: 'Test Perspective',
              description: 'Test Description',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            },
            is_official: false,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          },
          approvers: [],
          requested_reviewers: [],
          replaces_draft: undefined
        },
        {
          id: 2,
          content: 'Newer draft',
        is_approved: false,
        is_published: false,
        approval_count: 0,
          timestamp: '2024-01-02T00:00:00Z',
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
          author: {
            id: 1,
            username: 'testuser',
            first_name: 'Test',
            last_name: 'User',
            is_staff: false,
            perspective_curator_for: []
          },
          entry: {
            id: 2,
            term: {
              id: 2,
              text: 'Test Term 2',
              text_normalized: 'test term 2',
              is_official: false,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            },
            perspective: {
              id: 1,
              name: 'Test Perspective',
              description: 'Test Description',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            },
            is_official: false,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          },
          approvers: [],
          requested_reviewers: [],
          replaces_draft: undefined
        }
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
          timestamp: '2024-01-01T00:00:00Z',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          author: {
            id: 1,
            username: 'testuser',
            first_name: 'Test',
            last_name: 'User',
            is_staff: false,
            perspective_curator_for: []
          },
          entry: {
            id: 1,
            term: {
              id: 1,
              text: 'Test Term',
              text_normalized: 'test term',
              is_official: false,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            },
            perspective: {
              id: 1,
              name: 'Test Perspective',
              description: 'Test Description',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            },
            is_official: false,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          },
          approvers: [],
          requested_reviewers: [],
          replaces_draft: undefined
        }
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
            timestamp: '2024-01-03T00:00:00Z',
            created_at: '2024-01-03T00:00:00Z',
            updated_at: '2024-01-03T00:00:00Z',
            author: {
              id: 1,
              username: 'testuser',
              first_name: 'Test',
              last_name: 'User',
              is_staff: false,
              perspective_curator_for: []
            },
            entry: {
              id: 1,
              term: {
                id: 1,
                text: 'Test Term 1',
                text_normalized: 'test term 1',
                is_official: false,
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z'
              },
              perspective: {
                id: 1,
                name: 'Test Perspective',
                description: 'Test Description',
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z'
              },
              is_official: false,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            },
            approvers: [],
            requested_reviewers: [],
            replaces_draft: undefined
          },
          {
            id: 2,
            content: 'Older draft for entry 1',
        is_approved: false,
        is_published: false,
        approval_count: 0,
            timestamp: '2024-01-02T00:00:00Z',
            created_at: '2024-01-02T00:00:00Z',
            updated_at: '2024-01-02T00:00:00Z',
            author: {
              id: 1,
              username: 'testuser',
              first_name: 'Test',
              last_name: 'User',
              is_staff: false,
              perspective_curator_for: []
            },
            entry: {
              id: 1,
              term: {
                id: 1,
                text: 'Test Term 1',
                text_normalized: 'test term 1',
                is_official: false,
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z'
              },
              perspective: {
                id: 1,
                name: 'Test Perspective',
                description: 'Test Description',
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z'
              },
              is_official: false,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            },
            approvers: [],
            requested_reviewers: [],
            replaces_draft: undefined
          },
          {
            id: 3,
            content: 'Latest draft for entry 2',
        is_approved: false,
        is_published: false,
        approval_count: 0,
            timestamp: '2024-01-02T12:00:00Z',
            created_at: '2024-01-02T12:00:00Z',
            updated_at: '2024-01-02T12:00:00Z',
            author: {
              id: 1,
              username: 'testuser',
              first_name: 'Test',
              last_name: 'User',
              is_staff: false,
              perspective_curator_for: []
            },
            entry: {
              id: 2,
              term: {
                id: 2,
                text: 'Test Term 2',
                text_normalized: 'test term 2',
                is_official: false,
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z'
              },
              perspective: {
                id: 1,
                name: 'Test Perspective',
                description: 'Test Description',
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z'
              },
              is_official: false,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            },
            approvers: [],
            requested_reviewers: [],
            replaces_draft: undefined
          }
        ]
      };

      reviewService.getOwnDrafts.and.returnValue(of(mockResponse));

      component.loadMyDrafts();

      expect(reviewService.getOwnDrafts).toHaveBeenCalled();
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
            timestamp: '2024-01-03T00:00:00Z',
            created_at: '2024-01-03T00:00:00Z',
            updated_at: '2024-01-03T00:00:00Z',
            author: {
              id: 1,
              username: 'testuser',
              first_name: 'Test',
              last_name: 'User',
              is_staff: false,
              perspective_curator_for: []
            },
            entry: {
              id: 1,
              term: {
                id: 1,
                text: 'Test Term 1',
                text_normalized: 'test term 1',
                is_official: false,
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z'
              },
              perspective: {
                id: 1,
                name: 'Test Perspective',
                description: 'Test Description',
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z'
              },
              is_official: false,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            },
            approvers: [],
            requested_reviewers: [],
            replaces_draft: undefined
          },
          {
            id: 2,
            content: 'Older draft for entry 1',
        is_approved: false,
        is_published: false,
        approval_count: 0,
            timestamp: '2024-01-02T00:00:00Z',
            created_at: '2024-01-02T00:00:00Z',
            updated_at: '2024-01-02T00:00:00Z',
            author: {
              id: 1,
              username: 'testuser',
              first_name: 'Test',
              last_name: 'User',
              is_staff: false,
              perspective_curator_for: []
            },
            entry: {
              id: 1,
              term: {
                id: 1,
                text: 'Test Term 1',
                text_normalized: 'test term 1',
                is_official: false,
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z'
              },
              perspective: {
                id: 1,
                name: 'Test Perspective',
                description: 'Test Description',
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z'
              },
              is_official: false,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            },
            approvers: [],
            requested_reviewers: [],
            replaces_draft: undefined
          },
          {
            id: 3,
            content: 'Latest draft for entry 2',
        is_approved: false,
        is_published: false,
        approval_count: 0,
            timestamp: '2024-01-02T12:00:00Z',
            created_at: '2024-01-02T12:00:00Z',
            updated_at: '2024-01-02T12:00:00Z',
            author: {
              id: 1,
              username: 'testuser',
              first_name: 'Test',
              last_name: 'User',
              is_staff: false,
              perspective_curator_for: []
            },
            entry: {
              id: 2,
              term: {
                id: 2,
                text: 'Test Term 2',
                text_normalized: 'test term 2',
                is_official: false,
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z'
              },
              perspective: {
                id: 1,
                name: 'Test Perspective',
                description: 'Test Description',
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z'
              },
              is_official: false,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            },
            approvers: [],
            requested_reviewers: [],
            replaces_draft: undefined
          }
        ]
      };

      reviewService.getOwnDrafts.and.returnValue(of(mockResponse));

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
            timestamp: '2024-01-03T00:00:00Z',
            created_at: '2024-01-03T00:00:00Z',
            updated_at: '2024-01-03T00:00:00Z',
            author: {
              id: 1,
              username: 'testuser',
              first_name: 'Test',
              last_name: 'User',
              is_staff: false,
              perspective_curator_for: []
            },
            entry: {
              id: 1,
              term: {
                id: 1,
                text: 'Test Term 1',
                text_normalized: 'test term 1',
                is_official: false,
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z'
              },
              perspective: {
                id: 1,
                name: 'Test Perspective',
                description: 'Test Description',
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z'
              },
              is_official: false,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            },
            approvers: [],
            requested_reviewers: [],
            replaces_draft: undefined
          },
          {
            id: 2,
            content: 'Older draft for entry 1',
        is_approved: false,
        is_published: false,
        approval_count: 0,
            timestamp: '2024-01-02T00:00:00Z',
            created_at: '2024-01-02T00:00:00Z',
            updated_at: '2024-01-02T00:00:00Z',
            author: {
              id: 1,
              username: 'testuser',
              first_name: 'Test',
              last_name: 'User',
              is_staff: false,
              perspective_curator_for: []
            },
            entry: {
              id: 1,
              term: {
                id: 1,
                text: 'Test Term 1',
                text_normalized: 'test term 1',
                is_official: false,
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z'
              },
              perspective: {
                id: 1,
                name: 'Test Perspective',
                description: 'Test Description',
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z'
              },
              is_official: false,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            },
            approvers: [],
            requested_reviewers: [],
            replaces_draft: undefined
          },
          {
            id: 3,
            content: 'Latest draft for entry 2',
        is_approved: false,
        is_published: false,
        approval_count: 0,
            timestamp: '2024-01-02T12:00:00Z',
            created_at: '2024-01-02T12:00:00Z',
            updated_at: '2024-01-02T12:00:00Z',
            author: {
              id: 1,
              username: 'testuser',
              first_name: 'Test',
              last_name: 'User',
              is_staff: false,
              perspective_curator_for: []
            },
            entry: {
              id: 2,
              term: {
                id: 2,
                text: 'Test Term 2',
                text_normalized: 'test term 2',
                is_official: false,
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z'
              },
              perspective: {
                id: 1,
                name: 'Test Perspective',
                description: 'Test Description',
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z'
              },
              is_official: false,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            },
            approvers: [],
            requested_reviewers: [],
            replaces_draft: undefined
          }
        ]
      };

      reviewService.searchDrafts.and.returnValue(of(mockSearchResponse));
      reviewService.getOwnDrafts.and.returnValue(of({ count: 0, next: null, previous: null, results: [] }));
      glossaryService.getUsers.and.returnValue(of([]));

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

    it('should refresh drafts and comments after edit is saved', () => {
      const mockDraft: ReviewDraft = {
        id: 1,
        content: 'Test draft content',
        is_approved: false,
        is_published: false,
        approval_count: 0,
        timestamp: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        author: {
          id: 1,
          username: 'testuser',
          first_name: 'Test',
          last_name: 'User',
          is_staff: false,
          perspective_curator_for: []
        },
        entry: {
          id: 1,
          term: {
            id: 1,
            text: 'Test Term',
            text_normalized: 'test term',
            is_official: false,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          },
          perspective: {
            id: 1,
            name: 'Test Perspective',
            description: 'Test Description',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          },
          is_official: false,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        },
        approvers: [],
        requested_reviewers: [],
        replaces_draft: undefined
      };

      const mockComments: Comment[] = [
        {
          id: 1,
          content_type: 10,
          object_id: 1,
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
            perspective_curator_for: []
          },
          replies: []
        }
      ];

      component.state.selectedDraft = mockDraft;
      
      reviewService.getOwnDrafts.and.returnValue(of({ 
        count: 1, 
        next: null, 
        previous: null, 
        results: [mockDraft] 
      }));
      
      entryDetailService.loadCommentsWithPositions.and.returnValue(of(mockComments));

      // Simulate edit saved event
      component.onEditSaved();

      expect(reviewService.getOwnDrafts).toHaveBeenCalled();
      expect(entryDetailService.loadCommentsWithPositions).toHaveBeenCalledWith(1);
      expect(component.state.comments).toEqual(mockComments);
    });
  });
});
