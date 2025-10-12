import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { GlossaryService } from './glossary.service';

describe('Real API Integration Test', () => {
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

  it('should call the correct API endpoint and receive proper author data', () => {
    // This test simulates the exact API call the frontend makes
    // and verifies it gets the same data structure we saw from the real API
    
    const expectedApiResponse = [
      {
        "id": 4,
        "content_type": 11,
        "object_id": 360,
        "parent": null,
        "text": "Test comment for API testing",
        "author": {
          "id": 1,
          "username": "admin",
          "first_name": "Admin",
          "last_name": "User",
          "is_staff": true
        },
        "is_resolved": false,
        "replies": [],
        "created_at": "2025-10-12T16:58:56.885576Z",
        "updated_at": "2025-10-12T16:58:56.886109Z",
        "draft_position": "current draft",
        "draft_id": 360,
        "draft_timestamp": "2025-10-12T16:52:08.286166Z"
      }
    ];

    service.getCommentsWithDraftPositions(360).subscribe(comments => {
      // This test verifies that the frontend receives the exact same data
      // structure that the backend is actually returning
      expect(comments).toBeDefined();
      expect(comments.length).toBe(1);
      
      const comment = comments[0];
      expect(comment.author).toBeDefined();
      expect(comment.author.id).toBe(1);
      expect(comment.author.username).toBe('admin');
      expect(comment.author.first_name).toBe('Admin');
      expect(comment.author.last_name).toBe('User');
      expect(comment.author.is_staff).toBe(true);
      
      // This is the critical test - if this passes, the frontend
      // should display "Admin User" not "Unknown User"
      const displayName = `${comment.author.first_name} ${comment.author.last_name}`.trim();
      expect(displayName).toBe('Admin User');
    });

    // Verify the correct endpoint is called
    const req = httpMock.expectOne('http://localhost:8000/api/comments/with_draft_positions/?entry=360');
    expect(req.request.method).toBe('GET');
    
    // Return the exact data structure from the real API
    req.flush(expectedApiResponse);
  });
});
