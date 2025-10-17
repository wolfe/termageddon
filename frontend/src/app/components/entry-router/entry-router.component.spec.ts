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
  let originalConsoleError: any;

  beforeEach(async () => {
    // Suppress console.error during tests
    originalConsoleError = console.error;
    console.error = jasmine.createSpy('console.error');
    
    const glossaryServiceSpy = jasmine.createSpyObj('GlossaryService', ['getEntry']);
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['getCurrentUser']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    mockActivatedRoute = {
      params: of({ entryId: '1' }),
      snapshot: {
        url: [{ path: 'entry' }, { path: '1' }],
        queryParams: {}
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

  describe('new entry route handling', () => {
    beforeEach(() => {
      mockActivatedRoute.snapshot.url = [{ path: 'entry' }, { path: 'new' }];
      mockActivatedRoute.queryParams = of({ term: 'New Test Term', perspective: '1' });
      
      const glossaryServiceExtended = mockGlossaryService as any;
      glossaryServiceExtended.getTerms = jasmine.createSpy('getTerms');
      glossaryServiceExtended.getEntries = jasmine.createSpy('getEntries');
    });

    it('should handle new entry route with existing term', () => {
      const mockTermsResponse = {
        count: 1,
        results: [{
          id: 5,
          text: 'New Test Term',
          text_normalized: 'new test term',
          is_official: false,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }]
      };

      const mockEntriesResponse = {
        count: 0,
        results: []
      };

      (mockGlossaryService as any).getTerms.and.returnValue(of(mockTermsResponse));
      (mockGlossaryService as any).getEntries.and.returnValue(of(mockEntriesResponse));

      component.ngOnInit();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/my-drafts'], {
        queryParams: {
          newEntryTerm: 'New Test Term',
          newEntryPerspective: 1,
          edit: 'true'
        }
      });
    });

    it('should handle new entry route with brand new term', () => {
      const mockTermsResponse = {
        count: 0,
        results: []
      };

      const mockEntriesResponse = {
        count: 0,
        results: []
      };

      (mockGlossaryService as any).getTerms.and.returnValue(of(mockTermsResponse));
      (mockGlossaryService as any).getEntries.and.returnValue(of(mockEntriesResponse));

      component.ngOnInit();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/my-drafts'], {
        queryParams: {
          newEntryTerm: 'New Test Term',
          newEntryPerspective: 1,
          edit: 'true'
        }
      });
    });

    it('should redirect to existing entry when duplicate detected', () => {
      const mockTermsResponse = {
        count: 1,
        results: [{
          id: 5,
          text: 'New Test Term',
          text_normalized: 'new test term',
          is_official: false,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }]
      };

      const mockEntriesResponse = {
        count: 1,
        results: [{
          id: 10,
          term: mockTermsResponse.results[0],
          perspective: {
            id: 1,
            name: 'Test Perspective',
            description: '',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          },
          is_official: false,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }]
      };

      (mockGlossaryService as any).getTerms.and.returnValue(of(mockTermsResponse));
      (mockGlossaryService as any).getEntries.and.returnValue(of(mockEntriesResponse));

      component.ngOnInit();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/entry', 10]);
    });

    it('should navigate to glossary when missing required query params', () => {
      mockActivatedRoute.queryParams = of({ term: 'New Test Term' }); // Missing perspective

      component.ngOnInit();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/glossary']);
    });

    it('should use term_text parameter when term ID is not available', () => {
      const mockTermsResponse = {
        count: 0,
        results: []
      };

      const mockEntriesResponse = {
        count: 0,
        results: []
      };

      (mockGlossaryService as any).getTerms.and.returnValue(of(mockTermsResponse));
      (mockGlossaryService as any).getEntries.and.returnValue(of(mockEntriesResponse));

      component.ngOnInit();

      // Verify that getEntries was called with term_text instead of term ID
      expect((mockGlossaryService as any).getEntries).toHaveBeenCalledWith({
        perspective: 1,
        term_text: 'New Test Term'
      });
    });

    it('should use term ID parameter when term exists', () => {
      const mockTermsResponse = {
        count: 1,
        results: [{
          id: 5,
          text: 'New Test Term',
          text_normalized: 'new test term',
          is_official: false,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }]
      };

      const mockEntriesResponse = {
        count: 0,
        results: []
      };

      (mockGlossaryService as any).getTerms.and.returnValue(of(mockTermsResponse));
      (mockGlossaryService as any).getEntries.and.returnValue(of(mockEntriesResponse));

      component.ngOnInit();

      // Verify that getEntries was called with term ID
      expect((mockGlossaryService as any).getEntries).toHaveBeenCalledWith({
        perspective: 1,
        term: 5
      });
    });
  });
});
