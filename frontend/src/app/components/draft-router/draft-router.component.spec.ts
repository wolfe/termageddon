import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';

import { DraftRouterComponent } from './draft-router.component';
import { GlossaryService } from '../../services/glossary.service';
import { AuthService } from '../../services/auth.service';
import { EntryDraft, User } from '../../models';

describe('DraftRouterComponent', () => {
  let component: DraftRouterComponent;
  let fixture: ComponentFixture<DraftRouterComponent>;
  let mockGlossaryService: jasmine.SpyObj<GlossaryService>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockActivatedRoute: any;
  let originalConsoleError: any;

  beforeEach(async () => {
    // Suppress console.error during tests
    originalConsoleError = console.error;
    console.error = jasmine.createSpy('console.error');
    
    const glossaryServiceSpy = jasmine.createSpyObj('GlossaryService', ['getEntryDraft']);
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['getCurrentUser']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    mockActivatedRoute = {
      params: of({ draftId: '1' }),
      snapshot: {
        queryParams: {}
      }
    };

    await TestBed.configureTestingModule({
      imports: [DraftRouterComponent],
      providers: [
        { provide: GlossaryService, useValue: glossaryServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: mockActivatedRoute }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DraftRouterComponent);
    component = fixture.componentInstance;
    mockGlossaryService = TestBed.inject(GlossaryService) as jasmine.SpyObj<GlossaryService>;
    mockAuthService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  afterEach(() => {
    // Restore console.error after each test
    console.error = originalConsoleError;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('routing logic', () => {
    const mockUser: User = {
      id: 1,
      username: 'testuser',
      first_name: 'Test',
      last_name: 'User',
      is_staff: false,
      perspective_curator_for: []
    };

    beforeEach(() => {
      mockAuthService.getCurrentUser.and.returnValue(of(mockUser));
    });

    it('should route to glossary for published drafts', () => {
      const mockDraft: EntryDraft = {
        id: 1,
        content: 'Test content',
        is_approved: true,
        is_published: true,
        is_endorsed: false,
        approval_count: 2,
        timestamp: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        author: mockUser,
        entry: 1,
        approvers: [],
        requested_reviewers: [],
        replaces_draft: undefined
      };

      mockGlossaryService.getEntryDraft.and.returnValue(of(mockDraft));

      component.ngOnInit();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/glossary'], {
        queryParams: { draftId: 1 }
      });
    });

    it('should route to my-drafts for user\'s own unpublished drafts', () => {
      const mockDraft: EntryDraft = {
        id: 1,
        content: 'Test content',
        is_approved: false,
        is_published: false,
        is_endorsed: false,
        approval_count: 0,
        timestamp: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        author: mockUser,
        entry: 1,
        approvers: [],
        requested_reviewers: [],
        replaces_draft: undefined
      };

      mockGlossaryService.getEntryDraft.and.returnValue(of(mockDraft));

      component.ngOnInit();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/my-drafts'], {
        queryParams: { draftId: 1 }
      });
    });

    it('should route to review for others\' unpublished drafts', () => {
      const otherUser: User = {
        id: 2,
        username: 'otheruser',
        first_name: 'Other',
        last_name: 'User',
        is_staff: false,
        perspective_curator_for: []
      };

      const mockDraft: EntryDraft = {
        id: 1,
        content: 'Test content',
        is_approved: false,
        is_published: false,
        is_endorsed: false,
        approval_count: 0,
        timestamp: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        author: otherUser,
        entry: 1,
        approvers: [],
        requested_reviewers: [],
        replaces_draft: undefined
      };

      mockGlossaryService.getEntryDraft.and.returnValue(of(mockDraft));

      component.ngOnInit();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/review'], {
        queryParams: { draftId: 1 }
      });
    });

    it('should navigate to login when user is not authenticated', () => {
      mockAuthService.getCurrentUser.and.returnValue(throwError(() => new Error('Not authenticated')));

      const mockDraft: EntryDraft = {
        id: 1,
        content: 'Test content',
        is_approved: false,
        is_published: false,
        is_endorsed: false,
        approval_count: 0,
        timestamp: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        author: mockUser,
        entry: 1,
        approvers: [],
        requested_reviewers: [],
        replaces_draft: undefined
      };

      mockGlossaryService.getEntryDraft.and.returnValue(of(mockDraft));

      component.ngOnInit();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
    });

    it('should navigate to glossary when draft loading fails', () => {
      mockGlossaryService.getEntryDraft.and.returnValue(throwError(() => new Error('Draft not found')));

      component.ngOnInit();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/glossary']);
    });

    it('should navigate to glossary when no draftId is provided', () => {
      mockActivatedRoute.params = of({});

      component.ngOnInit();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/glossary']);
    });
  });
});
