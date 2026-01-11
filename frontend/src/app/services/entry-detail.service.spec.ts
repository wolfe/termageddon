import type { MockedObject } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { EntryDetailService } from './entry-detail.service';
import { GlossaryService } from './glossary.service';
import { ReviewService } from './review.service';
import { Entry, EntryDraft, ReviewDraft, User } from '../models';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('EntryDetailService', () => {
  let service: EntryDetailService;
  let glossaryService: MockedObject<GlossaryService>;
  let reviewService: MockedObject<ReviewService>;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    const glossarySpy = {
      getDraftHistory: vi.fn().mockName('GlossaryService.getDraftHistory'),
      getCommentsWithDraftPositions: vi
        .fn()
        .mockName('GlossaryService.getCommentsWithDraftPositions'),
      getComments: vi.fn().mockName('GlossaryService.getComments'),
      getEntry: vi.fn().mockName('GlossaryService.getEntry'),
      createEntryDraft: vi.fn().mockName('GlossaryService.createEntryDraft'),
    };
    const reviewSpy = {
      getDraftsCanApprove: vi.fn().mockName('ReviewService.getDraftsCanApprove'),
    };

    // Setup default return values for the spies
    glossarySpy.getDraftHistory.mockReturnValue(of([]));
    glossarySpy.getCommentsWithDraftPositions.mockReturnValue(of([]));
    glossarySpy.getComments.mockReturnValue(of({ results: [] }));
    glossarySpy.getEntry.mockReturnValue(of({} as Entry));
    glossarySpy.createEntryDraft.mockReturnValue(of({} as EntryDraft));

    TestBed.configureTestingModule({
      imports: [],
      providers: [
        EntryDetailService,
        { provide: GlossaryService, useValue: glossarySpy },
        { provide: ReviewService, useValue: reviewSpy },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(EntryDetailService);
    glossaryService = TestBed.inject(GlossaryService) as MockedObject<GlossaryService>;
    reviewService = TestBed.inject(ReviewService) as MockedObject<ReviewService>;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    // Only verify if httpMock is available
    if (httpMock) {
      httpMock.verify();
    }
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('initializeEditContentFromLatest', () => {
    it('should return latest draft content when draft history is available', () => {
      const draftHistory: EntryDraft[] = [
        {
          id: 1,
          content: 'Latest draft content',
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
          entry: 1,
          approvers: [],
          requested_reviewers: [],
          replaces_draft: undefined,
        },
        {
          id: 2,
          content: 'Previous draft content',
          is_approved: true,
          is_published: true,
          is_endorsed: false,
          approval_count: 2,
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
          entry: 1,
          approvers: [],
          requested_reviewers: [],
          replaces_draft: undefined,
        },
      ];

      const result = service.initializeEditContentFromLatest(draftHistory, 'Fallback content');
      expect(result).toBe('Latest draft content');
    });

    it('should return fallback content when draft history is empty', () => {
      const draftHistory: EntryDraft[] = [];
      const fallbackContent = 'Fallback content';

      const result = service.initializeEditContentFromLatest(draftHistory, fallbackContent);
      expect(result).toBe('Fallback content');
    });

    it('should return empty string when draft history is empty and no fallback', () => {
      const draftHistory: EntryDraft[] = [];

      const result = service.initializeEditContentFromLatest(draftHistory, '');
      expect(result).toBe('');
    });
  });

  describe('initializeEditContent', () => {
    it('should return ReviewDraft content when no active draft', () => {
      const reviewDraft: ReviewDraft = {
        id: 1,
        content: 'ReviewDraft content',
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

      const result = service.initializeEditContent(reviewDraft);
      expect(result).toBe('ReviewDraft content');
    });

    it('should return empty string for invalid entry', () => {
      const invalidEntry = {} as ReviewDraft;

      const result = service.initializeEditContent(invalidEntry);
      expect(result).toBe('');
    });
  });

  describe('getEntryId', () => {
    it('should return entry ID for Entry object', () => {
      const entry: Entry = {
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
      };

      const result = service.getEntryId(entry);
      expect(result).toBe(1);
    });

    it('should return entry ID for ReviewDraft object', () => {
      const reviewDraft: ReviewDraft = {
        id: 1,
        content: 'Test content',
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
          id: 2,
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

      const result = service.getEntryId(reviewDraft);
      expect(result).toBe(2);
    });

    it('should return null for invalid object', () => {
      const invalidObject = {} as ReviewDraft;

      const result = service.getEntryId(invalidObject);
      expect(result).toBeNull();
    });
  });
});
