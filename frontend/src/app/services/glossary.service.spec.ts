import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { GlossaryService } from './glossary.service';
import { Domain, Entry, EntryVersion, Term, User, PaginatedResponse } from '../models';

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

  describe('Domain operations', () => {
    it('should get domains', () => {
      const mockResponse: PaginatedResponse<Domain> = {
        count: 2,
        next: null,
        previous: null,
        results: [
          { id: 1, name: 'Domain 1', description: 'Description 1', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
          { id: 2, name: 'Domain 2', description: 'Description 2', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' }
        ]
      };

      service.getDomains().subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne('http://localhost:8000/api/domains/');
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should get domain by id', () => {
      const mockDomain: Domain = {
        id: 1,
        name: 'Test Domain',
        description: 'Test Description',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      service.getDomain(1).subscribe(domain => {
        expect(domain).toEqual(mockDomain);
      });

      const req = httpMock.expectOne('http://localhost:8000/api/domains/1/');
      expect(req.request.method).toBe('GET');
      req.flush(mockDomain);
    });

    it('should create domain', () => {
      const newDomain = { name: 'New Domain', description: 'New Description' };
      const mockDomain: Domain = {
        id: 1,
        name: 'New Domain',
        description: 'New Description',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      service.createDomain(newDomain).subscribe(domain => {
        expect(domain).toEqual(mockDomain);
      });

      const req = httpMock.expectOne('http://localhost:8000/api/domains/');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(newDomain);
      req.flush(mockDomain);
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
            domain: {
              id: 1,
              name: 'Test Domain',
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

      const filters = { domain: '1', approval_status: 'approved' };
      service.getEntries(filters).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne('http://localhost:8000/api/entries/?domain=1&approval_status=approved');
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

      service.searchEntries('test', { domain: '1' }).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne('http://localhost:8000/api/entries/?search=test&domain=1');
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
        domain: {
          id: 1,
          name: 'Test Domain',
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
          domain_expert_for: []
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
});
