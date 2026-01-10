import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { CommentThreadComponent } from './comment-thread.component';
import { GlossaryService } from '../../services/glossary.service';
import { PermissionService } from '../../services/permission.service';
import { Comment, User } from '../../models';
import { of, throwError } from 'rxjs';

describe('CommentThreadComponent', () => {
  let component: CommentThreadComponent;
  let fixture: ComponentFixture<CommentThreadComponent>;
  let glossaryService: jasmine.SpyObj<GlossaryService>;
  let permissionService: jasmine.SpyObj<PermissionService>;
  let originalConsoleError: typeof console.error;
  let originalConsoleWarn: typeof console.warn;

  beforeEach(async () => {
    // Suppress console.error and console.warn during tests
    originalConsoleError = console.error;
    originalConsoleWarn = console.warn;
    console.error = jasmine.createSpy('console.error');
    console.warn = jasmine.createSpy('console.warn');
    const glossarySpy = jasmine.createSpyObj('GlossaryService', [
      'createComment',
      'updateComment',
      'resolveComment',
      'unresolveComment',
      'reactToComment',
      'unreactToComment',
    ]);
    const currentUserValue = {
      id: 1,
      username: 'testuser',
      first_name: 'Test',
      last_name: 'User',
      is_staff: false,
      perspective_curator_for: [],
    };
    const permissionSpy = jasmine.createSpyObj('PermissionService', ['setCurrentUser'], {
      currentUser$: of(currentUserValue),
      get currentUser() {
        return currentUserValue;
      },
    });
    // Set initial currentUser via setCurrentUser
    permissionSpy.setCurrentUser(currentUserValue);

    await TestBed.configureTestingModule({
      imports: [CommentThreadComponent, HttpClientTestingModule],
      providers: [
        { provide: GlossaryService, useValue: glossarySpy },
        { provide: PermissionService, useValue: permissionSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CommentThreadComponent);
    component = fixture.componentInstance;
    glossaryService = TestBed.inject(GlossaryService) as jasmine.SpyObj<GlossaryService>;
    permissionService = TestBed.inject(PermissionService) as jasmine.SpyObj<PermissionService>;

    component.draftId = 1;
  });

  afterEach(() => {
    // Restore console.error and console.warn after each test
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('comment editing', () => {
    let comment: Comment;
    let currentUser: User;

    beforeEach(() => {
      currentUser = {
        id: 1,
        username: 'testuser',
        first_name: 'Test',
        last_name: 'User',
        is_staff: false,
        perspective_curator_for: [],
      };
      permissionService.setCurrentUser(currentUser);

      comment = {
        id: 1,
        draft_id: 1,
        text: 'Original comment',
        author: currentUser,
        is_resolved: false,
        replies: [],
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      };
      component.comments = [comment];
    });

    it('should start editing comment', () => {
      component.startEdit(comment);

      expect(component.editingComment).toBe(comment);
      expect(component.editText).toBe('Original comment');
    });

    it('should cancel editing', () => {
      component.startEdit(comment);
      component.cancelEdit();

      expect(component.editingComment).toBeNull();
      expect(component.editText).toBe('');
    });

    it('should submit edited comment', () => {
      const updatedComment: Comment = {
        ...comment,
        text: 'Updated comment',
        edited_at: '2023-01-02T00:00:00Z',
      };

      glossaryService.updateComment.and.returnValue(of(updatedComment));
      component.startEdit(comment);
      component.editText = 'Updated comment';

      component.submitEdit();

      expect(glossaryService.updateComment).toHaveBeenCalledWith(comment.id, 'Updated comment');
      // The comment in the array is updated by the component
      const updatedCommentInArray = component.comments.find(c => c.id === comment.id);
      expect(updatedCommentInArray?.text).toBe('Updated comment');
      expect(component.editingComment).toBeNull();
    });

    it('should handle edit submission errors', () => {
      glossaryService.updateComment.and.returnValue(
        throwError(() => ({ status: 403, message: 'Forbidden' }))
      );
      component.startEdit(comment);
      component.editText = 'Updated comment';

      component.submitEdit();

      expect(component.error).toBeTruthy();
      expect(component.editingComment).toBe(comment); // Still in edit mode
    });

    it('should allow editing own resolved comment', () => {
      comment.is_resolved = true;
      // canEdit only checks if user is the author, not if comment is resolved
      // So users can edit their own resolved comments
      expect(component.canEdit(comment)).toBe(true);
    });

    it('should not allow editing other users comments', () => {
      comment.author = {
        id: 2,
        username: 'otheruser',
        first_name: 'Other',
        last_name: 'User',
        is_staff: false,
        perspective_curator_for: [],
      };

      expect(component.canEdit(comment)).toBe(false);
    });
  });

  describe('comment reactions', () => {
    let comment: Comment;
    let currentUser: User;

    beforeEach(() => {
      currentUser = {
        id: 1,
        username: 'testuser',
        first_name: 'Test',
        last_name: 'User',
        is_staff: false,
        perspective_curator_for: [],
      };
      permissionService.setCurrentUser(currentUser);

      comment = {
        id: 1,
        draft_id: 1,
        text: 'Test comment',
        author: {
          id: 2,
          username: 'otheruser',
          first_name: 'Other',
          last_name: 'User',
          is_staff: false,
          perspective_curator_for: [],
        },
        is_resolved: false,
        replies: [],
        reaction_count: 0,
        user_has_reacted: false,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      };
      component.comments = [comment];
      // Ensure loading state is not set
      component.reactionLoadingCommentId = null;
    });

    it('should react to comment', () => {
      const updatedComment: Comment = {
        ...comment,
        reaction_count: 1,
        user_has_reacted: true,
      };

      glossaryService.reactToComment.and.returnValue(of(updatedComment));

      // Verify initial state
      expect(comment.user_has_reacted).toBe(false);
      expect(component.reactionLoadingCommentId).toBeNull();

      component.reactToComment(comment);

      expect(glossaryService.reactToComment).toHaveBeenCalledWith(comment.id);
      // Component updates comment in place via updateCommentInArray
      const updatedCommentInArray = component.comments.find(c => c.id === comment.id);
      expect(updatedCommentInArray?.reaction_count).toBe(1);
      expect(updatedCommentInArray?.user_has_reacted).toBe(true);
    });

    it('should handle reaction loading state', () => {
      const updatedComment: Comment = {
        ...comment,
        reaction_count: 1,
        user_has_reacted: true,
      };

      glossaryService.reactToComment.and.returnValue(of(updatedComment));

      // Verify initial state
      expect(component.reactionLoadingCommentId).toBeNull();

      component.reactToComment(comment);

      // Loading state is set before the API call
      // Since we're using synchronous observable, it completes immediately
      // and loading state is cleared in the subscribe handler
      expect(glossaryService.reactToComment).toHaveBeenCalledWith(comment.id);
      // After completion, loading state should be cleared
      expect(component.reactionLoadingCommentId).toBeNull();
    });

    it('should prevent multiple rapid reaction clicks', () => {
      component.reactionLoadingCommentId = comment.id;

      component.reactToComment(comment);

      expect(glossaryService.reactToComment).not.toHaveBeenCalled();
    });

    it('should handle reaction errors', () => {
      glossaryService.reactToComment.and.returnValue(
        throwError(() => ({ status: 500, message: 'Server error' }))
      );

      component.reactToComment(comment);

      expect(comment.reaction_count).toBe(0);
      expect(comment.user_has_reacted).toBe(false);
    });
  });

  describe('comment resolve/unresolve', () => {
    let comment: Comment;
    let currentUser: User;

    beforeEach(() => {
      currentUser = {
        id: 1,
        username: 'testuser',
        first_name: 'Test',
        last_name: 'User',
        is_staff: false,
        perspective_curator_for: [],
      };
      permissionService.setCurrentUser(currentUser);

      comment = {
        id: 1,
        draft_id: 1,
        text: 'Test comment',
        author: currentUser,
        is_resolved: false,
        replies: [],
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      };
      component.comments = [comment];
    });

    it('should resolve comment', () => {
      const updatedComment: Comment = {
        ...comment,
        is_resolved: true,
      };

      glossaryService.resolveComment.and.returnValue(of(updatedComment));
      let resolvedCommentEmitted: Comment | undefined;
      component.commentResolved.subscribe(resolvedComment => {
        resolvedCommentEmitted = resolvedComment;
      });

      component.resolveComment(comment);

      expect(glossaryService.resolveComment).toHaveBeenCalledWith(comment.id);
      expect(resolvedCommentEmitted?.is_resolved).toBe(true);
      // Component emits event but doesn't update comment in place for resolve
      // The parent component should handle the update
    });

    it('should unresolve comment', () => {
      comment.is_resolved = true;
      const updatedComment: Comment = {
        ...comment,
        is_resolved: false,
      };

      glossaryService.unresolveComment.and.returnValue(of(updatedComment));
      let unresolvedCommentEmitted: Comment | undefined;
      component.commentUnresolved.subscribe(unresolvedComment => {
        unresolvedCommentEmitted = unresolvedComment;
      });

      component.unresolveComment(comment);

      expect(glossaryService.unresolveComment).toHaveBeenCalledWith(comment.id);
      expect(unresolvedCommentEmitted?.is_resolved).toBe(false);
      // Component emits event but doesn't update comment in place for unresolve
      // The parent component should handle the update
    });

    it('should handle resolve errors', () => {
      glossaryService.resolveComment.and.returnValue(
        throwError(() => ({ status: 403, message: 'Forbidden' }))
      );

      component.resolveComment(comment);

      expect(comment.is_resolved).toBe(false);
    });
  });

  describe('deeply nested replies', () => {
    it('should handle deeply nested comment replies', () => {
      const parent: Comment = {
        id: 1,
        draft_id: 1,
        text: 'Parent comment',
        author: { id: 1, username: 'user1', first_name: 'User', last_name: 'One', is_staff: false, perspective_curator_for: [] },
        is_resolved: false,
        replies: [],
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      };

      const reply1: Comment = {
        id: 2,
        draft_id: 1,
        text: 'Reply 1',
        author: { id: 2, username: 'user2', first_name: 'User', last_name: 'Two', is_staff: false, perspective_curator_for: [] },
        parent: 1,
        is_resolved: false,
        replies: [],
        created_at: '2023-01-02T00:00:00Z',
        updated_at: '2023-01-02T00:00:00Z',
      };

      const reply2: Comment = {
        id: 3,
        draft_id: 1,
        text: 'Reply 2',
        author: { id: 3, username: 'user3', first_name: 'User', last_name: 'Three', is_staff: false, perspective_curator_for: [] },
        parent: 2,
        is_resolved: false,
        replies: [],
        created_at: '2023-01-03T00:00:00Z',
        updated_at: '2023-01-03T00:00:00Z',
      };

      parent.replies = [reply1];
      reply1.replies = [reply2];
      component.comments = [parent];

      fixture.detectChanges();

      expect(component.comments[0].replies.length).toBe(1);
      expect(component.comments[0].replies[0].replies.length).toBe(1);
    });
  });
});
