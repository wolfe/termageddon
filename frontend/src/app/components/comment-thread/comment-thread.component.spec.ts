import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { CommentThreadComponent } from './comment-thread.component';
import { GlossaryService } from '../../services/glossary.service';
import { PermissionService } from '../../services/permission.service';
import { Comment, User } from '../../models';
import { of } from 'rxjs';

describe('CommentThreadComponent', () => {
  let component: CommentThreadComponent;
  let fixture: ComponentFixture<CommentThreadComponent>;
  let glossaryService: jasmine.SpyObj<GlossaryService>;
  let permissionService: jasmine.SpyObj<PermissionService>;

  const mockUser: User = {
    id: 1,
    username: 'testuser',
    first_name: 'John',
    last_name: 'Doe',
    is_staff: false,
    perspective_curator_for: []
  };

  const mockComment: Comment = {
    id: 1,
    content_type: 1,
    object_id: 1,
    text: 'Test comment',
    author: mockUser,
    is_resolved: false,
    replies: [],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  };

  beforeEach(async () => {
    const glossarySpy = jasmine.createSpyObj('GlossaryService', ['createComment', 'resolveComment']);
    const permissionSpy = jasmine.createSpyObj('PermissionService', [], {
      currentUser$: of(mockUser),
      currentUser: mockUser
    });

    await TestBed.configureTestingModule({
      imports: [CommentThreadComponent, HttpClientTestingModule],
      providers: [
        { provide: GlossaryService, useValue: glossarySpy },
        { provide: PermissionService, useValue: permissionSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CommentThreadComponent);
    component = fixture.componentInstance;
    glossaryService = TestBed.inject(GlossaryService) as jasmine.SpyObj<GlossaryService>;
    permissionService = TestBed.inject(PermissionService) as jasmine.SpyObj<PermissionService>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Author Display', () => {
    it('should display author name correctly when comment has proper author data', () => {
      // Set up component with a comment that has proper author data
      component.comments = [mockComment];
      component.objectId = 1;
      component.contentType = 1;
      
      fixture.detectChanges();

      // Get the author name element
      const authorNameElement = fixture.debugElement.nativeElement.querySelector('.author-name');
      
      // Verify the author name is displayed correctly
      expect(authorNameElement).toBeTruthy();
      expect(authorNameElement.textContent.trim()).toBe('John Doe');
    });

    it('should display username when author has no first/last name', () => {
      const commentWithUsernameOnly: Comment = {
        ...mockComment,
        author: {
          ...mockUser,
          first_name: '',
          last_name: '',
          username: 'johndoe123'
        }
      };

      component.comments = [commentWithUsernameOnly];
      component.objectId = 1;
      component.contentType = 1;
      
      fixture.detectChanges();

      const authorNameElement = fixture.debugElement.nativeElement.querySelector('.author-name');
      
      expect(authorNameElement).toBeTruthy();
      expect(authorNameElement.textContent.trim()).toBe('johndoe123');
    });

    it('should display "Unknown User" when author data is missing or invalid', () => {
      const commentWithInvalidAuthor: Comment = {
        ...mockComment,
        author: {
          id: 0,
          username: '',
          first_name: '',
          last_name: '',
          is_staff: false,
          perspective_curator_for: []
        }
      };

      component.comments = [commentWithInvalidAuthor];
      component.objectId = 1;
      component.contentType = 1;
      
      fixture.detectChanges();

      const authorNameElement = fixture.debugElement.nativeElement.querySelector('.author-name');
      
      expect(authorNameElement).toBeTruthy();
      expect(authorNameElement.textContent.trim()).toBe('Unknown User');
    });
  });

  describe('Comment Creation', () => {
    it('should create comment with proper author data', () => {
      const mockCreateCommentRequest = {
        content_type: 1,
        object_id: 1,
        text: 'New comment',
        author: mockUser.id
      };

      const mockCreatedComment: Comment = {
        ...mockComment,
        id: 2,
        text: 'New comment',
        author: mockUser
      };

      glossaryService.createComment.and.returnValue(of(mockCreatedComment));

      component.objectId = 1;
      component.contentType = 1;
      component.newCommentText = 'New comment';
      
      component.submitNewComment();

      expect(glossaryService.createComment).toHaveBeenCalledWith(mockCreateCommentRequest);
    });
  });
});
