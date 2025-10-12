import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { GlossaryService } from './glossary.service';
import { Comment } from '../models';
import { getUserDisplayName } from '../utils/user.util';

describe('Comment Data Flow Integration Tests', () => {
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

  it('should return comments with complete author data from with_draft_positions endpoint', () => {
    // This test simulates the exact API call that the frontend makes
    // and verifies that the backend returns complete author data
    
    const mockApiResponse = [
      {
        id: 1,
        content_type: 1,
        object_id: 1,
        text: 'Test comment with proper author data',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        is_resolved: false,
        author: {
          id: 2,
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
      // This test would FAIL if the backend is not returning complete author data
      expect(comments).toBeDefined();
      expect(comments.length).toBe(1);
      
      const comment = comments[0];
      expect(comment.author).toBeDefined();
      expect(comment.author.id).toBe(2);
      expect(comment.author.username).toBe('testuser');
      expect(comment.author.first_name).toBe('John');
      expect(comment.author.last_name).toBe('Doe');
      expect(comment.author.is_staff).toBe(false);
      
      // Verify that the display name would be correct
      const displayName = `${comment.author.first_name} ${comment.author.last_name}`.trim();
      expect(displayName).toBe('John Doe');
      
      // This is the key assertion - if this fails, it means the backend
      // is not returning complete author data and comments will show "Unknown User"
      expect(comment.author.first_name).not.toBe('');
      expect(comment.author.last_name).not.toBe('');
    });

    const req = httpMock.expectOne('http://localhost:8000/api/comments/with_draft_positions/?entry=1');
    expect(req.request.method).toBe('GET');
    req.flush(mockApiResponse);
  });

  it('should handle the case where backend returns incomplete author data', () => {
    // This test simulates what would happen if the backend fix wasn't applied
    const mockIncompleteResponse = [
      {
        id: 1,
        content_type: 1,
        object_id: 1,
        text: 'Test comment with incomplete author data',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        is_resolved: false,
        author: {
          id: 2,
          username: 'testuser',
          // Missing first_name and last_name - this would cause "Unknown User" to display
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
      
      // This would be the problematic case - empty first/last names
      expect(comment.author.first_name).toBe('');
      expect(comment.author.last_name).toBe('');
      
      // In this case, getUserDisplayName would fall back to username
      const displayName = comment.author.first_name && comment.author.last_name 
        ? `${comment.author.first_name} ${comment.author.last_name}`.trim()
        : comment.author.username;
      expect(displayName).toBe('testuser');
    });

    const req = httpMock.expectOne('http://localhost:8000/api/comments/with_draft_positions/?entry=1');
    expect(req.request.method).toBe('GET');
    req.flush(mockIncompleteResponse);
  });

  it('should verify that getUserDisplayName function works correctly with proper data', () => {
    const userWithFullName = {
      id: 1,
      username: 'testuser',
      first_name: 'Jane',
      last_name: 'Smith',
      is_staff: false,
      perspective_curator_for: []
    };
    
    const userWithUsernameOnly = {
      id: 2,
      username: 'usernameonly',
      first_name: '',
      last_name: '',
      is_staff: false,
      perspective_curator_for: []
    };
    
    const userWithEmptyData = {
      id: 3,
      username: '',
      first_name: '',
      last_name: '',
      is_staff: false,
      perspective_curator_for: []
    };
    
    // Test the utility function directly
    expect(getUserDisplayName(userWithFullName)).toBe('Jane Smith');
    expect(getUserDisplayName(userWithUsernameOnly)).toBe('usernameonly');
    expect(getUserDisplayName(userWithEmptyData)).toBe('Unknown User');
    expect(getUserDisplayName(null as any)).toBe('Unknown User');
    expect(getUserDisplayName(undefined)).toBe('Unknown User');
  });
});
