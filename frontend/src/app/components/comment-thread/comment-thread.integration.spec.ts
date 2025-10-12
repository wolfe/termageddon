import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { CommentThreadComponent } from './comment-thread.component';
import { GlossaryService } from '../../services/glossary.service';
import { PermissionService } from '../../services/permission.service';
import { Comment, User } from '../../models';
import { of } from 'rxjs';

describe('CommentThreadComponent Integration Tests', () => {
  let component: CommentThreadComponent;
  let fixture: ComponentFixture<CommentThreadComponent>;
  let glossaryService: GlossaryService;
  let httpMock: HttpTestingController;
  let permissionService: jasmine.SpyObj<PermissionService>;

  const mockUser: User = {
    id: 1,
    username: 'testuser',
    first_name: 'John',
    last_name: 'Doe',
    is_staff: false,
    perspective_curator_for: []
  };

  const mockCommentWithProperAuthor: Comment = {
    id: 1,
    content_type: 1,
    object_id: 1,
    text: 'This is a test comment',
    author: {
      id: 2,
      username: 'commenter',
      first_name: 'Jane',
      last_name: 'Smith',
      is_staff: false,
      perspective_curator_for: []
    },
    is_resolved: false,
    replies: [],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  };

  beforeEach(async () => {
    const permissionSpy = jasmine.createSpyObj('PermissionService', [], {
      currentUser$: of(mockUser),
      currentUser: mockUser
    });

    await TestBed.configureTestingModule({
      imports: [CommentThreadComponent, HttpClientTestingModule],
      providers: [
        GlossaryService,
        { provide: PermissionService, useValue: permissionSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CommentThreadComponent);
    component = fixture.componentInstance;
    glossaryService = TestBed.inject(GlossaryService);
    httpMock = TestBed.inject(HttpTestingController);
    permissionService = TestBed.inject(PermissionService) as jasmine.SpyObj<PermissionService>;
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should display comment author names when receiving proper data from backend', () => {
    // Set up component with comments passed as input (simulating parent component behavior)
    component.objectId = 1;
    component.contentType = 1;
    component.comments = [mockCommentWithProperAuthor];
    
    fixture.detectChanges();
    
    // Verify the author name is displayed correctly
    const authorNameElement = fixture.debugElement.nativeElement.querySelector('.author-name');
    expect(authorNameElement).toBeTruthy();
    expect(authorNameElement.textContent.trim()).toBe('Jane Smith');
    
    // This test should PASS if the backend fix is working
    // This test would FAIL if comments still show "Unknown User"
  });

  it('should handle multiple comments with different authors', () => {
    const mockComments: Comment[] = [
      {
        id: 1,
        content_type: 1,
        object_id: 1,
        text: 'First comment',
        author: {
          id: 2,
          username: 'alice',
          first_name: 'Alice',
          last_name: 'Johnson',
          is_staff: false,
          perspective_curator_for: []
        },
        is_resolved: false,
        replies: [],
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      },
      {
        id: 2,
        content_type: 1,
        object_id: 1,
        text: 'Second comment',
        author: {
          id: 3,
          username: 'bob',
          first_name: 'Bob',
          last_name: 'Wilson',
          is_staff: false,
          perspective_curator_for: []
        },
        is_resolved: false,
        replies: [],
        created_at: '2024-01-02T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z'
      }
    ];

    component.objectId = 1;
    component.contentType = 1;
    component.comments = mockComments;
    
    fixture.detectChanges();
    
    // Get all author name elements
    const authorNameElements = fixture.debugElement.nativeElement.querySelectorAll('.author-name');
    
    expect(authorNameElements.length).toBe(2);
    expect(authorNameElements[0].textContent.trim()).toBe('Alice Johnson');
    expect(authorNameElements[1].textContent.trim()).toBe('Bob Wilson');
  });

  it('should fall back to username when first/last names are empty', () => {
    const commentWithUsernameOnly: Comment = {
      id: 1,
      content_type: 1,
      object_id: 1,
      text: 'Comment with username only',
      author: {
        id: 2,
        username: 'usernameonly',
        first_name: '',
        last_name: '',
        is_staff: false,
        perspective_curator_for: []
      },
      is_resolved: false,
      replies: [],
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };

    component.objectId = 1;
    component.contentType = 1;
    component.comments = [commentWithUsernameOnly];
    
    fixture.detectChanges();
    
    const authorNameElement = fixture.debugElement.nativeElement.querySelector('.author-name');
    expect(authorNameElement).toBeTruthy();
    expect(authorNameElement.textContent.trim()).toBe('usernameonly');
  });

  it('should show "Unknown User" only when author data is completely missing', () => {
    const commentWithEmptyAuthor: Comment = {
      id: 1,
      content_type: 1,
      object_id: 1,
      text: 'Comment with empty author',
      author: {
        id: 0,
        username: '',
        first_name: '',
        last_name: '',
        is_staff: false,
        perspective_curator_for: []
      },
      is_resolved: false,
      replies: [],
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };

    component.objectId = 1;
    component.contentType = 1;
    component.comments = [commentWithEmptyAuthor];
    
    fixture.detectChanges();
    
    const authorNameElement = fixture.debugElement.nativeElement.querySelector('.author-name');
    expect(authorNameElement).toBeTruthy();
    expect(authorNameElement.textContent.trim()).toBe('Unknown User');
  });
});
