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
  let reviewService: jasmine.SpyObj<ReviewService>;
  let glossaryService: jasmine.SpyObj<GlossaryService>;
  let permissionService: jasmine.SpyObj<PermissionService>;
  let notificationService: jasmine.SpyObj<NotificationService>;
  let entryDetailService: jasmine.SpyObj<EntryDetailService>;
  let urlHelperService: jasmine.SpyObj<UrlHelperService>;
  let router: jasmine.SpyObj<Router>;
  let location: jasmine.SpyObj<Location>;
  let activatedRoute: jasmine.SpyObj<ActivatedRoute>;

  beforeEach(async () => {
    const reviewSpy = jasmine.createSpyObj('ReviewService', [
      'getDraftsCanApprove',
      'searchDrafts',
      'approveDraft',
      'requestReview',
      'publishDraft',
    ]);
    const glossarySpy = jasmine.createSpyObj('GlossaryService', ['getUsers', 'getPerspectives']);
    const permissionSpy = jasmine.createSpyObj('PermissionService', [], {
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
    });
    const notificationSpy = jasmine.createSpyObj('NotificationService', [
      'success',
      'error',
      'warning',
    ]);
    const entryDetailSpy = jasmine.createSpyObj('EntryDetailService', [
      'loadCommentsWithPositions',
    ]);
    const urlHelperSpy = jasmine.createSpyObj('UrlHelperService', ['buildDraftUrl']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    const locationSpy = jasmine.createSpyObj('Location', ['replaceState']);
    const activatedRouteSpy = jasmine.createSpyObj('ActivatedRoute', [], {
      queryParams: of({}),
      snapshot: {
        queryParams: {},
      },
    });

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
    ]
}).compileComponents();

    fixture = TestBed.createComponent(ReviewDashboardComponent);
    component = fixture.componentInstance;
    reviewService = TestBed.inject(ReviewService) as jasmine.SpyObj<ReviewService>;
    glossaryService = TestBed.inject(GlossaryService) as jasmine.SpyObj<GlossaryService>;
    permissionService = TestBed.inject(PermissionService) as jasmine.SpyObj<PermissionService>;
    notificationService = TestBed.inject(
      NotificationService
    ) as jasmine.SpyObj<NotificationService>;
    entryDetailService = TestBed.inject(EntryDetailService) as jasmine.SpyObj<EntryDetailService>;
    urlHelperService = TestBed.inject(UrlHelperService) as jasmine.SpyObj<UrlHelperService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    location = TestBed.inject(Location) as jasmine.SpyObj<Location>;
    activatedRoute = TestBed.inject(ActivatedRoute) as jasmine.SpyObj<ActivatedRoute>;
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
      entryDetailService.loadCommentsWithPositions.and.returnValue(of({ count: mockComments.length, next: null, previous: null, results: mockComments }));
      reviewService.getDraftsCanApprove.and.returnValue(
        of({ count: 0, next: null, previous: null, results: [] })
      );
      glossaryService.getPerspectives.and.returnValue(
        of({ count: 0, next: null, previous: null, results: [] })
      );

      // Simulate edit saved event
      component.onEditSaved();

      expect(entryDetailService.loadCommentsWithPositions).toHaveBeenCalledWith(1);
      expect(component.state.comments).toEqual(jasmine.arrayContaining(mockComments));
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

      reviewService.getDraftsCanApprove.and.returnValue(of(mockResponse));
      glossaryService.getPerspectives.and.returnValue(
        of({ count: 0, next: null, previous: null, results: [] })
      );

      // Simulate edit saved event
      component.onEditSaved();

      expect(reviewService.getDraftsCanApprove).toHaveBeenCalledWith(
        false,
        undefined,
        '-published_at'
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

      entryDetailService.loadCommentsWithPositions.and.returnValue(of({ count: mockComments.length, next: null, previous: null, results: mockComments }));

      component.selectDraft(mockDraft);

      expect(component.state.selectedDraft).toBe(mockDraft);
      expect(entryDetailService.loadCommentsWithPositions).toHaveBeenCalledWith(1);
      expect(component.state.comments).toEqual(jasmine.arrayContaining(mockComments));
    });
  });
});
