import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { MyDraftsComponent } from './my-drafts.component';
import { ReviewService } from '../../services/review.service';
import { GlossaryService } from '../../services/glossary.service';
import { PermissionService } from '../../services/permission.service';
import { EntryDetailService } from '../../services/entry-detail.service';
import { ReviewDraft, User, Comment } from '../../models';

describe('MyDraftsComponent', () => {
  let component: MyDraftsComponent;
  let fixture: ComponentFixture<MyDraftsComponent>;
  let reviewService: jasmine.SpyObj<ReviewService>;
  let glossaryService: jasmine.SpyObj<GlossaryService>;
  let permissionService: jasmine.SpyObj<PermissionService>;
  let entryDetailService: jasmine.SpyObj<EntryDetailService>;

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
      'loadCommentsWithPositions'
    ]);

    await TestBed.configureTestingModule({
      imports: [MyDraftsComponent, HttpClientTestingModule],
      providers: [
        { provide: ReviewService, useValue: reviewSpy },
        { provide: GlossaryService, useValue: glossarySpy },
        { provide: PermissionService, useValue: permissionSpy },
        { provide: EntryDetailService, useValue: entryDetailSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MyDraftsComponent);
    component = fixture.componentInstance;
    reviewService = TestBed.inject(ReviewService) as jasmine.SpyObj<ReviewService>;
    glossaryService = TestBed.inject(GlossaryService) as jasmine.SpyObj<GlossaryService>;
    permissionService = TestBed.inject(PermissionService) as jasmine.SpyObj<PermissionService>;
    entryDetailService = TestBed.inject(EntryDetailService) as jasmine.SpyObj<EntryDetailService>;
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

      const result = component['getLatestDraftsPerEntry'](drafts);

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

      const result = component['getLatestDraftsPerEntry'](drafts);

      expect(result.length).toBe(2);
      expect(result[0].id).toBe(2); // Newer draft should be first
      expect(result[0].content).toBe('Newer draft');
      expect(result[1].id).toBe(1); // Older draft should be second
      expect(result[1].content).toBe('Older draft');
    });

    it('should handle empty array', () => {
      const drafts: ReviewDraft[] = [];

      const result = component['getLatestDraftsPerEntry'](drafts);

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

      const result = component['getLatestDraftsPerEntry'](drafts);

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
      expect(component.drafts.length).toBe(2); // Only latest drafts per entry
      expect(component.drafts[0].id).toBe(1); // Latest draft for entry 1
      expect(component.drafts[1].id).toBe(3); // Latest draft for entry 2
      expect(component.filteredDrafts).toEqual(component.drafts);
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
      expect(component.drafts.length).toBe(2);
      expect(component.drafts[0].id).toBe(1); // Latest draft for entry 1
      expect(component.drafts[1].id).toBe(3); // Latest draft for entry 2
      
      // Verify older draft (id: 2) is not included
      const draftIds = component.drafts.map(d => d.id);
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

      component.searchTerm = 'test';
      component.ngOnInit(); // Ensure currentUser is initialized
      component.onSearch();

      // Should only show 2 drafts (latest per entry), not 3
      expect(component.filteredDrafts.length).toBe(2);
      expect(component.filteredDrafts[0].id).toBe(1); // Latest draft for entry 1
      expect(component.filteredDrafts[1].id).toBe(3); // Latest draft for entry 2
      
      // Verify older draft (id: 2) is not included
      const draftIds = component.filteredDrafts.map(d => d.id);
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
          content_type: 1,
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

      component.selectedDraft = mockDraft;
      
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
      expect(component.comments).toEqual(jasmine.arrayContaining(mockComments));
    });
  });
});
