import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';

import { EntryRouterComponent } from './entry-router.component';
import { GlossaryService } from '../../services/glossary.service';
import { AuthService } from '../../services/auth.service';
import { Entry, User } from '../../models';

describe('EntryRouterComponent', () => {
  let component: EntryRouterComponent;
  let fixture: ComponentFixture<EntryRouterComponent>;
  let mockGlossaryService: jasmine.SpyObj<GlossaryService>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockActivatedRoute: any;

  beforeEach(async () => {
    const glossaryServiceSpy = jasmine.createSpyObj('GlossaryService', ['getEntry']);
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['getCurrentUser']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    mockActivatedRoute = {
      params: of({ entryId: '1' }),
      snapshot: {
        url: [{ path: 'entry' }, { path: '1' }]
      }
    };

    await TestBed.configureTestingModule({
      imports: [EntryRouterComponent],
      providers: [
        { provide: GlossaryService, useValue: glossaryServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: mockActivatedRoute }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(EntryRouterComponent);
    component = fixture.componentInstance;
    mockGlossaryService = TestBed.inject(GlossaryService) as jasmine.SpyObj<GlossaryService>;
    mockAuthService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;
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

    it('should route to glossary for published entries', () => {
      const mockEntry: Entry = {
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
        updated_at: '2024-01-01T00:00:00Z',
        active_draft: {
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
        }
      };

      mockGlossaryService.getEntry.and.returnValue(of(mockEntry));

      component.ngOnInit();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/glossary'], {
        queryParams: { entryId: 1, edit: undefined }
      });
    });

    it('should route to my-drafts for user\'s own unpublished drafts', () => {
      const mockEntry: Entry = {
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
        updated_at: '2024-01-01T00:00:00Z',
        active_draft: {
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
        }
      };

      mockGlossaryService.getEntry.and.returnValue(of(mockEntry));

      component.ngOnInit();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/my-drafts'], {
        queryParams: { entryId: 1, edit: undefined }
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

      const mockEntry: Entry = {
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
        updated_at: '2024-01-01T00:00:00Z',
        active_draft: {
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
        }
      };

      mockGlossaryService.getEntry.and.returnValue(of(mockEntry));

      component.ngOnInit();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/review'], {
        queryParams: { entryId: 1, edit: undefined }
      });
    });

    it('should handle edit mode correctly', () => {
      mockActivatedRoute.snapshot.url = [{ path: 'entry' }, { path: '1' }, { path: 'edit' }];

      const mockEntry: Entry = {
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
        updated_at: '2024-01-01T00:00:00Z',
        active_draft: {
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
        }
      };

      mockGlossaryService.getEntry.and.returnValue(of(mockEntry));

      component.ngOnInit();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/my-drafts'], {
        queryParams: { entryId: 1, edit: 'true' }
      });
    });

    it('should navigate to login when user is not authenticated', () => {
      mockAuthService.getCurrentUser.and.returnValue(throwError(() => new Error('Not authenticated')));

      const mockEntry: Entry = {
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
      };

      mockGlossaryService.getEntry.and.returnValue(of(mockEntry));

      component.ngOnInit();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
    });

    it('should navigate to glossary when entry loading fails', () => {
      mockGlossaryService.getEntry.and.returnValue(throwError(() => new Error('Entry not found')));

      component.ngOnInit();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/glossary']);
    });

    it('should navigate to glossary when no entryId is provided', () => {
      mockActivatedRoute.params = of({});

      component.ngOnInit();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/glossary']);
    });
  });
});
