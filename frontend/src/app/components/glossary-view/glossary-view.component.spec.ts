import type { MockedObject } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { Subject, of, throwError } from 'rxjs';
import { GlossaryViewComponent } from './glossary-view.component';
import { GlossaryService } from '../../services/glossary.service';
import { UrlHelperService } from '../../services/url-helper.service';
import { Entry, Term, Perspective } from '../../models';

describe('GlossaryViewComponent', () => {
  let component: GlossaryViewComponent;
  let fixture: ComponentFixture<GlossaryViewComponent>;
  let glossaryService: MockedObject<GlossaryService>;
  let router: MockedObject<Router>;
  let location: MockedObject<Location>;
  let urlHelper: MockedObject<UrlHelperService>;
  let queryParams$: Subject<any>;
  let originalConsoleError: typeof console.error;

  const mockTerm: Term = {
    id: 1,
    text: 'Test Term',
    text_normalized: 'test term',
    is_official: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  const mockPerspective: Perspective = {
    id: 1,
    name: 'Test Perspective',
    description: 'Test Description',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  const mockEntry: Entry = {
    id: 123,
    term: mockTerm,
    perspective: mockPerspective,
    is_official: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  beforeEach(async () => {
    originalConsoleError = console.error;
    console.error = vi.fn();
    queryParams$ = new Subject();

    const glossaryServiceSpy = {
      getEntryById: vi.fn().mockName('GlossaryService.getEntryById'),
      getDraftById: vi.fn().mockName('GlossaryService.getDraftById'),
      getEntries: vi.fn().mockName('GlossaryService.getEntries'),
      getEntriesGroupedByTerm: vi.fn().mockName('GlossaryService.getEntriesGroupedByTerm').mockReturnValue(
        of({ count: 0, next: null, previous: null, results: [] })
      ),
      getPerspectives: vi.fn().mockName('GlossaryService.getPerspectives').mockReturnValue(
        of({ count: 0, next: null, previous: null, results: [] })
      ),
      getUsers: vi.fn().mockName('GlossaryService.getUsers').mockReturnValue(
        of({ count: 0, next: null, previous: null, results: [] })
      ),
    };

    const routerSpy = {
      navigate: vi.fn().mockName('Router.navigate'),
    };

    const locationSpy = {
      replaceState: vi.fn().mockName('Location.replaceState'),
    };

    const urlHelperSpy = {
      buildEntryUrl: vi.fn().mockName('UrlHelperService.buildEntryUrl'),
    };

    const activatedRouteSpy = {
      queryParams: queryParams$.asObservable(),
    };

    await TestBed.configureTestingModule({
      imports: [GlossaryViewComponent],
      providers: [
        { provide: GlossaryService, useValue: glossaryServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: Location, useValue: locationSpy },
        { provide: UrlHelperService, useValue: urlHelperSpy },
        { provide: ActivatedRoute, useValue: activatedRouteSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GlossaryViewComponent);
    component = fixture.componentInstance;
    glossaryService = TestBed.inject(GlossaryService) as MockedObject<GlossaryService>;
    router = TestBed.inject(Router) as MockedObject<Router>;
    location = TestBed.inject(Location) as MockedObject<Location>;
    urlHelper = TestBed.inject(UrlHelperService) as MockedObject<UrlHelperService>;
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit with entryId', () => {
    it('should load entry when entryId is provided', () => {
      glossaryService.getEntryById.mockReturnValue(of(mockEntry));
      glossaryService.getEntries.mockReturnValue(
        of({ count: 1, next: null, previous: null, results: [mockEntry] })
      );
      urlHelper.buildEntryUrl.mockReturnValue('/glossary?entryId=123');

      fixture.detectChanges();
      queryParams$.next({ entryId: '123' });

      expect(glossaryService.getEntryById).toHaveBeenCalledWith(123);
      expect(component.selectedEntry).toEqual(mockEntry);
      expect(glossaryService.getEntries).toHaveBeenCalledWith({ term: 1 });
    });

    it('should navigate away on error loading entry', () => {
      glossaryService.getEntryById.mockReturnValue(
        throwError(() => ({ status: 404, message: 'Not found' }))
      );

      fixture.detectChanges();
      queryParams$.next({ entryId: '123' });

      expect(router.navigate).toHaveBeenCalledWith(['/glossary']);
    });
  });

  describe('ngOnInit with draftId', () => {
    it('should load entry from published draft', () => {
      const mockDraft = {
        id: 456,
        is_published: true,
        entry: { id: 123 },
      };

      glossaryService.getDraftById.mockReturnValue(of(mockDraft));
      glossaryService.getEntryById.mockReturnValue(of(mockEntry));
      glossaryService.getEntries.mockReturnValue(
        of({ count: 1, next: null, previous: null, results: [mockEntry] })
      );
      urlHelper.buildEntryUrl.mockReturnValue('/glossary?entryId=123');

      fixture.detectChanges();
      queryParams$.next({ draftId: '456' });

      expect(glossaryService.getDraftById).toHaveBeenCalledWith(456);
      expect(glossaryService.getEntryById).toHaveBeenCalledWith(123);
      expect(component.selectedEntry).toEqual(mockEntry);
      expect(location.replaceState).toHaveBeenCalledWith('/glossary?entryId=123');
      expect(glossaryService.getEntries).toHaveBeenCalledWith({ term: 1 });
    });

    it('should load entry from unpublished draft', () => {
      const mockDraft = {
        id: 456,
        is_published: false,
        entry: { id: 123 },
      };

      glossaryService.getDraftById.mockReturnValue(of(mockDraft));
      glossaryService.getEntryById.mockReturnValue(of(mockEntry));
      glossaryService.getEntries.mockReturnValue(
        of({ count: 1, next: null, previous: null, results: [mockEntry] })
      );
      urlHelper.buildEntryUrl.mockReturnValue('/glossary?entryId=123');

      fixture.detectChanges();
      queryParams$.next({ draftId: '456' });

      expect(glossaryService.getDraftById).toHaveBeenCalledWith(456);
      expect(glossaryService.getEntryById).toHaveBeenCalledWith(123);
      expect(component.selectedEntry).toEqual(mockEntry);
    });

    it('should navigate away when draft has no entry', () => {
      const mockDraft = {
        id: 456,
        is_published: false,
        entry: null,
      };

      glossaryService.getDraftById.mockReturnValue(of(mockDraft));

      fixture.detectChanges();
      queryParams$.next({ draftId: '456' });

      expect(router.navigate).toHaveBeenCalledWith(['/glossary'], { replaceUrl: true });
      expect(glossaryService.getEntryById).not.toHaveBeenCalled();
    });

    it('should navigate away on error loading draft', () => {
      glossaryService.getDraftById.mockReturnValue(
        throwError(() => ({ status: 404, message: 'Not found' }))
      );

      fixture.detectChanges();
      queryParams$.next({ draftId: '456' });

      expect(router.navigate).toHaveBeenCalledWith(['/glossary'], { replaceUrl: true });
    });

    it('should navigate away on error loading entry from draft', () => {
      const mockDraft = {
        id: 456,
        is_published: true,
        entry: { id: 123 },
      };

      glossaryService.getDraftById.mockReturnValue(of(mockDraft));
      glossaryService.getEntryById.mockReturnValue(
        throwError(() => ({ status: 404, message: 'Not found' }))
      );

      fixture.detectChanges();
      queryParams$.next({ draftId: '456' });

      expect(router.navigate).toHaveBeenCalledWith(['/glossary'], { replaceUrl: true });
    });
  });

  describe('loadEntryById', () => {
    it('should load entry and update URL', () => {
      glossaryService.getEntryById.mockReturnValue(of(mockEntry));
      glossaryService.getEntries.mockReturnValue(
        of({ count: 1, next: null, previous: null, results: [mockEntry] })
      );
      urlHelper.buildEntryUrl.mockReturnValue('/glossary?entryId=123');

      component['loadEntryById'](123);

      expect(component.selectedEntry).toEqual(mockEntry);
      expect(location.replaceState).toHaveBeenCalledWith('/glossary?entryId=123');
      expect(glossaryService.getEntries).toHaveBeenCalledWith({ term: 1 });
    });

    it('should set edit mode when specified', () => {
      glossaryService.getEntryById.mockReturnValue(of(mockEntry));
      glossaryService.getEntries.mockReturnValue(
        of({ count: 1, next: null, previous: null, results: [mockEntry] })
      );
      urlHelper.buildEntryUrl.mockReturnValue('/glossary?entryId=123');

      component['loadEntryById'](123, true);

      expect(component.isEditMode).toBe(true);
    });
  });
});
