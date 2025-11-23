import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { DraftDetailPanelComponent } from './draft-detail-panel.component';
import { EntryDetailService } from '../../../services/entry-detail.service';
import { PermissionService } from '../../../services/permission.service';
import { NotificationService } from '../../../services/notification.service';
import { ReviewDraft, EntryDraft, User } from '../../../models';

describe('DraftDetailPanelComponent', () => {
  let component: DraftDetailPanelComponent;
  let fixture: ComponentFixture<DraftDetailPanelComponent>;
  let entryDetailService: jasmine.SpyObj<EntryDetailService>;
  let permissionService: jasmine.SpyObj<PermissionService>;
  let notificationService: jasmine.SpyObj<NotificationService>;

  beforeEach(async () => {
    const entryDetailSpy = jasmine.createSpyObj('EntryDetailService', [
      'loadDraftHistory',
      'initializeEditContentFromLatest',
      'createNewDraft',
    ]);
    const permissionSpy = jasmine.createSpyObj('PermissionService', [], {
      currentUser: {
        id: 1,
        username: 'testuser',
        first_name: 'Test',
        last_name: 'User',
        is_staff: false,
        perspective_curator_for: [],
      },
    });
    const notificationSpy = jasmine.createSpyObj('NotificationService', ['success', 'error']);

    await TestBed.configureTestingModule({
      imports: [DraftDetailPanelComponent, HttpClientTestingModule],
      providers: [
        { provide: EntryDetailService, useValue: entryDetailSpy },
        { provide: PermissionService, useValue: permissionSpy },
        { provide: NotificationService, useValue: notificationSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DraftDetailPanelComponent);
    component = fixture.componentInstance;
    entryDetailService = TestBed.inject(EntryDetailService) as jasmine.SpyObj<EntryDetailService>;
    permissionService = TestBed.inject(PermissionService) as jasmine.SpyObj<PermissionService>;
    notificationService = TestBed.inject(
      NotificationService
    ) as jasmine.SpyObj<NotificationService>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('getProposedDefinitionContent', () => {
    it('should return latestDraft content when latestDraft is available', () => {
      const latestDraft: EntryDraft = {
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
      };

      component.latestDraft = latestDraft;
      component.draft = {
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

      const result = component.getProposedDefinitionContent();
      expect(result).toBe('Latest draft content');
    });

    it('should return draft content when latestDraft is not available', () => {
      component.latestDraft = null;
      component.draft = {
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

      const result = component.getProposedDefinitionContent();
      expect(result).toBe('ReviewDraft content');
    });

    it('should return empty string when both latestDraft and draft are not available', () => {
      component.latestDraft = null;
      component.draft = null;

      const result = component.getProposedDefinitionContent();
      expect(result).toBe('');
    });
  });

  describe('onEdit', () => {
    it('should initialize edit content using latest draft from history', () => {
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
      ];

      component.draftHistory = draftHistory;
      component.draft = {
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

      entryDetailService.initializeEditContentFromLatest.and.returnValue('Latest draft content');

      component.onEdit();

      expect(entryDetailService.initializeEditContentFromLatest).toHaveBeenCalledWith(
        draftHistory,
        'ReviewDraft content'
      );
      expect(component.editContent).toBe('Latest draft content');
      expect(component.isEditMode).toBe(true);
    });
  });

  describe('loadDraftHistory', () => {
    it('should load draft history and set latestDraft', () => {
      const mockDrafts: EntryDraft[] = [
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

      component.draft = {
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

      entryDetailService.loadDraftHistory.and.returnValue(of({ count: mockDrafts.length, next: null, previous: null, results: mockDrafts }));

      component.loadDraftHistory();

      expect(entryDetailService.loadDraftHistory).toHaveBeenCalledWith(1);
      expect(component.draftHistory).toEqual(mockDrafts);
      expect(component.latestDraft).toBe(mockDrafts[0]);
    });
  });
});
