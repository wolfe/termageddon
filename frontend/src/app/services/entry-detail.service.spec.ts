import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { EntryDetailService } from './entry-detail.service';
import { GlossaryService } from './glossary.service';
import { ReviewService } from './review.service';
import { Entry, EntryDraft, ReviewDraft, User } from '../models';

describe('EntryDetailService', () => {
  let service: EntryDetailService;
  let glossaryService: jasmine.SpyObj<GlossaryService>;
  let reviewService: jasmine.SpyObj<ReviewService>;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    const glossarySpy = jasmine.createSpyObj('GlossaryService', [
      'getDraftHistory',
      'getCommentsWithDraftPositions',
      'getComments',
      'getEntry',
      'createEntryDraft'
    ]);
    const reviewSpy = jasmine.createSpyObj('ReviewService', ['getDraftsCanApprove']);

    // Setup default return values for the spies
    glossarySpy.getDraftHistory.and.returnValue(of([]));
    glossarySpy.getCommentsWithDraftPositions.and.returnValue(of([]));
    glossarySpy.getComments.and.returnValue(of({ results: [] }));
    glossarySpy.getEntry.and.returnValue(of({} as Entry));
    glossarySpy.createEntryDraft.and.returnValue(of({} as EntryDraft));

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        EntryDetailService,
        { provide: GlossaryService, useValue: glossarySpy },
        { provide: ReviewService, useValue: reviewSpy }
      ]
    });

    service = TestBed.inject(EntryDetailService);
    glossaryService = TestBed.inject(GlossaryService) as jasmine.SpyObj<GlossaryService>;
    reviewService = TestBed.inject(ReviewService) as jasmine.SpyObj<ReviewService>;
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
          entry: 1,
          approvers: [],
          requested_reviewers: [],
          replaces_draft: undefined
        },
        {
          id: 2,
          content: 'Previous draft content',
          is_approved: true,
          is_published: true,
          is_endorsed: false,
          approval_count: 2,
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
          entry: 1,
          approvers: [],
          requested_reviewers: [],
          replaces_draft: undefined
        }
      ];

      const result = service.initializeEditContentFromLatest(draftHistory);
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

      const result = service.initializeEditContentFromLatest(draftHistory);
      expect(result).toBe('');
    });
  });

  describe('initializeEditContentForReviewDraft', () => {
    it('should return latest draft content when draft history is available', () => {
      const reviewDraft: ReviewDraft = {
        id: 1,
        content: 'ReviewDraft content',
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

      const draftHistory: EntryDraft[] = [
        {
          id: 2,
          content: 'Latest draft content',
          is_approved: false,
          is_published: false,
          is_endorsed: false,
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
          entry: 1,
          approvers: [],
          requested_reviewers: [],
          replaces_draft: undefined
        }
      ];

      const result = service.initializeEditContentForReviewDraft(reviewDraft, draftHistory);
      expect(result).toBe('Latest draft content');
    });

    it('should return ReviewDraft content when draft history is empty', () => {
      const reviewDraft: ReviewDraft = {
        id: 1,
        content: 'ReviewDraft content',
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

      const draftHistory: EntryDraft[] = [];

      const result = service.initializeEditContentForReviewDraft(reviewDraft, draftHistory);
      expect(result).toBe('ReviewDraft content');
    });
  });

  describe('getBottomSectionContent', () => {
    it('should return historical draft when selectedHistoricalDraft is provided', () => {
      const selectedHistoricalDraft: EntryDraft = {
        id: 1,
        content: 'Historical draft content',
        is_approved: false,
        is_published: false,
        is_endorsed: false,
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
        entry: 1,
        approvers: [],
        requested_reviewers: [],
        replaces_draft: undefined
      };

      const draftHistory: EntryDraft[] = [];
      const replacesDraft: EntryDraft = {
        id: 2,
        content: 'Replaces draft content',
        is_approved: true,
        is_published: true,
        is_endorsed: false,
        approval_count: 2,
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
        entry: 1,
        approvers: [],
        requested_reviewers: [],
        replaces_draft: undefined
      };

      const result = service.getBottomSectionContent(selectedHistoricalDraft, draftHistory, replacesDraft);
      expect(result.type).toBe('historical');
      expect(result.draft).toBe(selectedHistoricalDraft);
    });

    it('should return published draft when no historical draft is selected but published draft exists', () => {
      const selectedHistoricalDraft: EntryDraft | null = null;
      const draftHistory: EntryDraft[] = [
        {
          id: 1,
          content: 'Latest draft content',
          is_approved: false,
          is_published: false,
          is_endorsed: false,
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
          entry: 1,
          approvers: [],
          requested_reviewers: [],
          replaces_draft: undefined
        },
        {
          id: 2,
          content: 'Published draft content',
          is_approved: true,
          is_published: true,
          is_endorsed: false,
          approval_count: 2,
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
          entry: 1,
          approvers: [],
          requested_reviewers: [],
          replaces_draft: undefined
        }
      ];

      const result = service.getBottomSectionContent(selectedHistoricalDraft, draftHistory);
      expect(result.type).toBe('published');
      expect(result.draft?.content).toBe('Published draft content');
    });

    it('should return replaces draft when no published draft in history but replaces draft exists', () => {
      const selectedHistoricalDraft: EntryDraft | null = null;
      const draftHistory: EntryDraft[] = [
        {
          id: 1,
          content: 'Latest draft content',
          is_approved: false,
          is_published: false,
          is_endorsed: false,
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
          entry: 1,
          approvers: [],
          requested_reviewers: [],
          replaces_draft: undefined
        }
      ];
      const replacesDraft: EntryDraft = {
        id: 2,
        content: 'Replaces draft content',
        is_approved: true,
        is_published: true,
        is_endorsed: false,
        approval_count: 2,
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
        entry: 1,
        approvers: [],
        requested_reviewers: [],
        replaces_draft: undefined
      };

      const result = service.getBottomSectionContent(selectedHistoricalDraft, draftHistory, replacesDraft);
      expect(result.type).toBe('published');
      expect(result.draft).toBe(replacesDraft);
    });

    it('should return none when no historical, published, or replaces draft exists', () => {
      const selectedHistoricalDraft: EntryDraft | null = null;
      const draftHistory: EntryDraft[] = [
        {
          id: 1,
          content: 'Latest draft content',
          is_approved: false,
          is_published: false,
          is_endorsed: false,
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
          entry: 1,
          approvers: [],
          requested_reviewers: [],
          replaces_draft: undefined
        }
      ];

      const result = service.getBottomSectionContent(selectedHistoricalDraft, draftHistory);
      expect(result.type).toBe('none');
      expect(result.draft).toBeNull();
    });
  });
});
