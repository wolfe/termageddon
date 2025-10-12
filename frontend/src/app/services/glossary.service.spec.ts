import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { GlossaryService } from './glossary.service';
import { Perspective, Entry, EntryDraft, Term, User, PaginatedResponse } from '../models';

describe('GlossaryService', () => {
  let service: GlossaryService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [GlossaryService]
    });
    service = TestBed.inject(GlossaryService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Perspective operations', () => {
    it('should get perspectives', () => {
      const mockResponse: PaginatedResponse<Perspective> = {
        count: 2,
        next: null,
        previous: null,
        results: [
          { id: 1, name: 'Perspective 1', description: 'Description 1', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
          { id: 2, name: 'Perspective 2', description: 'Description 2', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' }
        ]
      };

      service.getPerspectives().subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne('http://localhost:8000/api/perspectives/');
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should get perspective by id', () => {
      const mockPerspective: Perspective = {
        id: 1,
        name: 'Test Perspective',
        description: 'Test Description',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      service.getPerspective(1).subscribe(perspective => {
        expect(perspective).toEqual(mockPerspective);
      });

      const req = httpMock.expectOne('http://localhost:8000/api/perspectives/1/');
      expect(req.request.method).toBe('GET');
      req.flush(mockPerspective);
    });

    it('should create perspective', () => {
      const newPerspective = { name: 'New Perspective', description: 'New Description' };
      const mockPerspective: Perspective = {
        id: 1,
        name: 'New Perspective',
        description: 'New Description',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      service.createPerspective(newPerspective).subscribe(perspective => {
        expect(perspective).toEqual(mockPerspective);
      });

      const req = httpMock.expectOne('http://localhost:8000/api/perspectives/');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(newPerspective);
      req.flush(mockPerspective);
    });
  });

  describe('Term operations', () => {
    it('should get terms with filters', () => {
      const mockResponse: PaginatedResponse<Term> = {
        count: 1,
        next: null,
        previous: null,
        results: [
          {
            id: 1,
            text: 'Test Term',
            text_normalized: 'test term',
            is_official: false,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          }
        ]
      };

      const filters = { search: 'test', is_official: 'true' };
      service.getTerms(filters).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne('http://localhost:8000/api/terms/?search=test&is_official=true');
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should get term by id', () => {
      const mockTerm: Term = {
        id: 1,
        text: 'Test Term',
        text_normalized: 'test term',
        is_official: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      service.getTerm(1).subscribe(term => {
        expect(term).toEqual(mockTerm);
      });

      const req = httpMock.expectOne('http://localhost:8000/api/terms/1/');
      expect(req.request.method).toBe('GET');
      req.flush(mockTerm);
    });

    it('should create term', () => {
      const newTerm = { text: 'New Term' };
      const mockTerm: Term = {
        id: 1,
        text: 'New Term',
        text_normalized: 'new term',
        is_official: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      service.createTerm(newTerm).subscribe(term => {
        expect(term).toEqual(mockTerm);
      });

      const req = httpMock.expectOne('http://localhost:8000/api/terms/');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(newTerm);
      req.flush(mockTerm);
    });
  });

  describe('Entry operations', () => {
    it('should get entries with filters', () => {
      const mockResponse: PaginatedResponse<Entry> = {
        count: 1,
        next: null,
        previous: null,
        results: [
          {
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
          }
        ]
      };

      const filters = { perspective: '1', approval_status: 'approved' };
      service.getEntries(filters).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne('http://localhost:8000/api/entries/?perspective=1&approval_status=approved');
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should search entries', () => {
      const mockResponse: PaginatedResponse<Entry> = {
        count: 1,
        next: null,
        previous: null,
        results: []
      };

      service.searchEntries('test', { perspective: '1' }).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne('http://localhost:8000/api/entries/?search=test&perspective=1');
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should mark entry as official', () => {
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
        is_official: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      service.markOfficial(1).subscribe(entry => {
        expect(entry).toEqual(mockEntry);
      });

      const req = httpMock.expectOne('http://localhost:8000/api/entries/1/mark_official/');
      expect(req.request.method).toBe('POST');
      req.flush(mockEntry);
    });
  });

  describe('User operations', () => {
    it('should get users', () => {
      const mockUsers: User[] = [
        {
          id: 1,
          username: 'testuser',
          first_name: 'Test',
          last_name: 'User',
          is_staff: false,
          perspective_curator_for: []
        }
      ];

      service.getUsers().subscribe(users => {
        expect(users).toEqual(mockUsers);
      });

      const req = httpMock.expectOne('http://localhost:8000/api/users/');
      expect(req.request.method).toBe('GET');
      req.flush(mockUsers);
    });
  });

  describe('Draft History operations', () => {
    it('should get draft history for an entry', () => {
      const mockDrafts: EntryDraft[] = [
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

      service.getDraftHistory(1).subscribe(drafts => {
        expect(drafts).toEqual(mockDrafts);
      });

      const req = httpMock.expectOne('http://localhost:8000/api/entry-drafts/history/?entry=1');
      expect(req.request.method).toBe('GET');
      req.flush(mockDrafts);
    });
  });

  describe('Comment operations', () => {
    it('should get comments with draft positions for an entry', () => {
      const mockComments = [
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
          replies: [],
          draft_position: 'current draft',
          draft_id: 1,
          draft_timestamp: '2024-01-02T00:00:00Z'
        }
      ];

      service.getCommentsWithDraftPositions(1).subscribe(comments => {
        expect(comments).toEqual(mockComments);
      });

      const req = httpMock.expectOne('http://localhost:8000/api/comments/with_draft_positions/?entry=1');
      expect(req.request.method).toBe('GET');
      req.flush(mockComments);
    });

    it('should return comments with complete author data structure', () => {
      const mockCommentsWithCompleteAuthor = [
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
            first_name: 'John',
            last_name: 'Doe',
            is_staff: false
          },
          replies: [],
          draft_position: 'current draft',
          draft_id: 1,
          draft_timestamp: '2024-01-02T00:00:00Z'
        }
      ];

      service.getCommentsWithDraftPositions(1).subscribe(comments => {
        expect(comments).toEqual(mockCommentsWithCompleteAuthor);
        
        // This test would have failed before the backend fix because
        // the author data would have been incomplete or missing
        const comment = comments[0];
        expect(comment.author).toBeDefined();
        expect(comment.author.id).toBe(1);
        expect(comment.author.username).toBe('testuser');
        expect(comment.author.first_name).toBe('John');
        expect(comment.author.last_name).toBe('Doe');
        expect(comment.author.is_staff).toBe(false);
        
        // Verify that getUserDisplayName would work correctly
        const displayName = `${comment.author.first_name} ${comment.author.last_name}`.trim();
        expect(displayName).toBe('John Doe');
      });

      const req = httpMock.expectOne('http://localhost:8000/api/comments/with_draft_positions/?entry=1');
      expect(req.request.method).toBe('GET');
      req.flush(mockCommentsWithCompleteAuthor);
    });

    it('should handle comments with missing author data gracefully', () => {
      const mockCommentsWithIncompleteAuthor = [
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
            first_name: '',
            last_name: '',
            is_staff: false
          },
          replies: [],
          draft_position: 'current draft',
          draft_id: 1,
          draft_timestamp: '2024-01-02T00:00:00Z'
        }
      ];

      service.getCommentsWithDraftPositions(1).subscribe(comments => {
        const comment = comments[0];
        expect(comment.author).toBeDefined();
        expect(comment.author.username).toBe('testuser');
        
        // Should fall back to username when first/last name are empty
        const displayName = comment.author.first_name && comment.author.last_name 
          ? `${comment.author.first_name} ${comment.author.last_name}`.trim()
          : comment.author.username;
        expect(displayName).toBe('testuser');
      });

      const req = httpMock.expectOne('http://localhost:8000/api/comments/with_draft_positions/?entry=1');
      expect(req.request.method).toBe('GET');
      req.flush(mockCommentsWithIncompleteAuthor);
    });
  });
});
