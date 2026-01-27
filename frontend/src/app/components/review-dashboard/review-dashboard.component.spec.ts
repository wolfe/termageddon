import type { MockedObject } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { of } from 'rxjs';
import { ReviewDashboardComponent } from './review-dashboard.component';
import { ReviewService } from '../../services/review.service';
import { GlossaryService } from '../../services/glossary.service';
import { PermissionService } from '../../services/permission.service';
import { NotificationService } from '../../services/notification.service';
import { EntryDetailService } from '../../services/entry-detail.service';
import { UrlHelperService } from '../../services/url-helper.service';
import { ReviewDraft, User, Comment } from '../../models';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('ReviewDashboardComponent Integration Tests', () => {
  let component: ReviewDashboardComponent;
  let fixture: ComponentFixture<ReviewDashboardComponent>;
  let reviewService: MockedObject<ReviewService>;
  let glossaryService: MockedObject<GlossaryService>;
  let permissionService: MockedObject<PermissionService>;
  let notificationService: MockedObject<NotificationService>;
  let entryDetailService: MockedObject<EntryDetailService>;
  let urlHelperService: MockedObject<UrlHelperService>;
  let router: MockedObject<Router>;
  let location: MockedObject<Location>;
  let activatedRoute: MockedObject<ActivatedRoute>;

  beforeEach(async () => {
    const reviewSpy = {
      getDraftsCanApprove: vi.fn().mockName('ReviewService.getDraftsCanApprove'),
      searchDrafts: vi.fn().mockName('ReviewService.searchDrafts'),
      approveDraft: vi.fn().mockName('ReviewService.approveDraft'),
      requestReview: vi.fn().mockName('ReviewService.requestReview'),
      publishDraft: vi.fn().mockName('ReviewService.publishDraft'),
    };
    const glossarySpy = {
      getUsers: vi.fn().mockName('GlossaryService.getUsers'),
      getPerspectives: vi.fn().mockName('GlossaryService.getPerspectives'),
    };
    const permissionSpy = {
      currentUser$: {
        subscribe: (callback: any) =>
          callback({
            id: 1,
            username: 'testuser',
            first_name: 'Test',
            last_name: 'User',
            is_staff: false,
            perspective_curator_for: [],
          }),
      },
    };
    const notificationSpy = {
      success: vi.fn().mockName('NotificationService.success'),
      error: vi.fn().mockName('NotificationService.error'),
      warning: vi.fn().mockName('NotificationService.warning'),
    };
    const entryDetailSpy = {
      loadCommentsWithPositions: vi.fn().mockName('EntryDetailService.loadCommentsWithPositions'),
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

    await TestBed.configureTestingModule({
      imports: [ReviewDashboardComponent],
      providers: [
        { provide: ReviewService, useValue: reviewSpy },
        { provide: GlossaryService, useValue: glossarySpy },
        { provide: PermissionService, useValue: permissionSpy },
        { provide: NotificationService, useValue: notificationSpy },
        { provide: EntryDetailService, useValue: entryDetailSpy },
        { provide: UrlHelperService, useValue: urlHelperSpy },
        { provide: Router, useValue: routerSpy },
        { provide: Location, useValue: locationSpy },
        { provide: ActivatedRoute, useValue: activatedRouteSpy },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ReviewDashboardComponent);
    component = fixture.componentInstance;
    reviewService = TestBed.inject(ReviewService) as MockedObject<ReviewService>;
    glossaryService = TestBed.inject(GlossaryService) as MockedObject<GlossaryService>;
    permissionService = TestBed.inject(PermissionService) as MockedObject<PermissionService>;
    notificationService = TestBed.inject(NotificationService) as MockedObject<NotificationService>;
    entryDetailService = TestBed.inject(EntryDetailService) as MockedObject<EntryDetailService>;
    urlHelperService = TestBed.inject(UrlHelperService) as MockedObject<UrlHelperService>;
    router = TestBed.inject(Router) as MockedObject<Router>;
    location = TestBed.inject(Location) as MockedObject<Location>;
    activatedRoute = TestBed.inject(ActivatedRoute) as MockedObject<ActivatedRoute>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Proposed Definition Display Integration', () => {
    it('should refresh comments after edit is saved', () => {
      const mockDraft: ReviewDraft = {
        id: 1,
        content: 'Original draft content',
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
      entryDetailService.loadCommentsWithPositions.mockReturnValue(
        of({ count: mockComments.length, next: null, previous: null, results: mockComments })
      );
      reviewService.getDraftsCanApprove.mockReturnValue(
        of({ count: 0, next: null, previous: null, results: [] })
      );
      glossaryService.getPerspectives.mockReturnValue(
        of({ count: 0, next: null, previous: null, results: [] })
      );

      // Simulate edit saved event
      component.onEditSaved();

      expect(entryDetailService.loadCommentsWithPositions).toHaveBeenCalledWith(1);
      expect(component.state.comments).toEqual(expect.arrayContaining(mockComments));
    });

    it('should load pending drafts after edit is saved', () => {
      const mockResponse = {
        count: 1,
        next: null,
        previous: null,
        results: [
          {
            id: 1,
            content: 'Updated draft content',
            is_approved: false,
            is_published: false,
            is_endorsed: false,
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
        ],
      };

      reviewService.getDraftsCanApprove.mockReturnValue(of(mockResponse));
      glossaryService.getPerspectives.mockReturnValue(
        of({ count: 0, next: null, previous: null, results: [] })
      );

      // Simulate edit saved event
      component.onEditSaved();

      expect(reviewService.getDraftsCanApprove).toHaveBeenCalledWith(
        false,
        undefined,
        '-created_at'
      );
      expect(component.state.drafts).toEqual(mockResponse.results);
      expect(component.state.filteredDrafts).toEqual(mockResponse.results);
    });
  });

  describe('Draft Selection Integration', () => {
    it('should load comments when draft is selected', () => {
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

      entryDetailService.loadCommentsWithPositions.mockReturnValue(
        of({ count: mockComments.length, next: null, previous: null, results: mockComments })
      );

      component.selectDraft(mockDraft);

      expect(component.state.selectedDraft).toBe(mockDraft);
      expect(entryDetailService.loadCommentsWithPositions).toHaveBeenCalledWith(1);
      expect(component.state.comments).toEqual(expect.arrayContaining(mockComments));
    });
  });
});
