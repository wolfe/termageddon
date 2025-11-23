import { TestBed } from '@angular/core/testing';
import { UrlHelperService } from './url-helper.service';
import { Entry, ReviewDraft } from '../models';

describe('UrlHelperService', () => {
  let service: UrlHelperService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UrlHelperService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('buildEntryUrl', () => {
    it('should build URL with query parameters', () => {
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

      const url = service.buildEntryUrl(1, entry, true);
      expect(url).toBe('/entry/1?term=test%20term&perspective=test%20perspective');
    });

    it('should build URL without query parameters when includeQueryParams is false', () => {
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

      const url = service.buildEntryUrl(1, entry, false);
      expect(url).toBe('/entry/1');
    });

    it('should handle entries without term/perspective', () => {
      const entry: Entry = {
        id: 1,
        term: undefined as any,
        perspective: undefined as any,
        is_official: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const url = service.buildEntryUrl(1, entry, true);
      expect(url).toBe('/entry/1');
    });

    it('should build URL without entry data', () => {
      const url = service.buildEntryUrl(1);
      expect(url).toBe('/entry/1');
    });
  });

  describe('buildDraftUrl', () => {
    it('should build URL with query parameters from draft entry', () => {
      const draft: ReviewDraft = {
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

      const url = service.buildDraftUrl(1, draft, true);
      expect(url).toBe('/draft/1?term=test%20term&perspective=test%20perspective');
    });

    it('should build URL without query parameters when includeQueryParams is false', () => {
      const draft: ReviewDraft = {
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

      const url = service.buildDraftUrl(1, draft, false);
      expect(url).toBe('/draft/1');
    });

    it('should handle drafts without entry data', () => {
      const url = service.buildDraftUrl(1);
      expect(url).toBe('/draft/1');
    });
  });

  describe('buildEditEntryUrl', () => {
    it('should build edit URL with query parameters', () => {
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

      const url = service.buildEditEntryUrl(1, entry, true);
      expect(url).toBe('/entry/1/edit?term=test%20term&perspective=test%20perspective');
    });

    it('should build edit URL without query parameters', () => {
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

      const url = service.buildEditEntryUrl(1, entry, false);
      expect(url).toBe('/entry/1/edit');
    });
  });

  describe('normalizeTermForUrl', () => {
    it('should handle special characters', () => {
      const normalized = service.normalizeTermForUrl('API & Database');
      expect(normalized).toBe('api%20%26%20database');
    });

    it('should handle empty strings', () => {
      const normalized = service.normalizeTermForUrl('');
      expect(normalized).toBe('');
    });

    it('should handle whitespace', () => {
      const normalized = service.normalizeTermForUrl('  Test Term  ');
      expect(normalized).toBe('test%20term');
    });

    it('should handle unicode characters', () => {
      const normalized = service.normalizeTermForUrl('Café');
      expect(normalized).toBe('caf%C3%A9');
    });
  });

  describe('normalizePerspectiveForUrl', () => {
    it('should handle special characters', () => {
      const normalized = service.normalizePerspectiveForUrl('Finance & Accounting');
      expect(normalized).toBe('finance%20%26%20accounting');
    });

    it('should handle empty strings', () => {
      const normalized = service.normalizePerspectiveForUrl('');
      expect(normalized).toBe('');
    });

    it('should handle whitespace', () => {
      const normalized = service.normalizePerspectiveForUrl('  Test Perspective  ');
      expect(normalized).toBe('test%20perspective');
    });
  });

  describe('parseQueryParams', () => {
    it('should parse query parameters correctly', () => {
      const queryParams = {
        term: 'test%20term',
        perspective: 'test%20perspective',
        other: 'value',
      };

      const result = service.parseQueryParams(queryParams);
      expect(result.term).toBe('test term');
      expect(result.perspective).toBe('test perspective');
    });

    it('should handle missing parameters', () => {
      const queryParams = {
        other: 'value',
      };

      const result = service.parseQueryParams(queryParams);
      expect(result.term).toBeUndefined();
      expect(result.perspective).toBeUndefined();
    });

    it('should handle empty query params', () => {
      const result = service.parseQueryParams({});
      expect(result.term).toBeUndefined();
      expect(result.perspective).toBeUndefined();
    });

    it('should handle null query params', () => {
      const result = service.parseQueryParams(null as any);
      expect(result.term).toBeUndefined();
      expect(result.perspective).toBeUndefined();
    });
  });
});
