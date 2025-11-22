export interface User {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  is_staff: boolean;
  perspective_curator_for?: number[];
  is_test_user?: boolean;
}

export interface Perspective {
  id: number;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface Term {
  id: number;
  text: string;
  text_normalized: string;
  is_official: boolean;
  is_highlighted?: boolean;
  created_at: string;
  updated_at: string;
}

export interface EntryDraft {
  id: number;
  entry: number;
  content: string;
  author: User;
  timestamp: string;
  approvers: User[];
  requested_reviewers: User[];
  endorsed_by?: User;
  endorsed_at?: string;
  replaces_draft?: number;
  is_approved: boolean;
  approval_count: number;
  is_published: boolean;
  is_endorsed: boolean;
  status?: string;
  // New user-centric fields from backend
  can_approve_by_current_user?: boolean;
  approval_status_for_user?:
    | 'unknown'
    | 'own_draft'
    | 'already_approved'
    | 'already_approved_by_others'
    | 'can_approve';
  user_has_approved?: boolean;
  remaining_approvals?: number;
  approval_percentage?: number;
  comment_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Entry {
  id: number;
  term: Term;
  perspective: Perspective;
  active_draft?: EntryDraft;
  is_official: boolean;
  // New permission fields from backend
  can_user_endorse?: boolean;
  can_user_edit?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: number;
  draft_id: number;
  parent?: number;
  text: string;
  author: User;
  mentioned_users?: User[];
  is_resolved: boolean;
  replies: Comment[];
  reaction_count?: number;
  user_has_reacted?: boolean;
  created_at: string;
  updated_at: string;
  edited_at?: string;
  // New fields for draft position tracking
  draft_position?: string;
  draft_timestamp?: string;
}

export interface Notification {
  id: number;
  type: string;
  message: string;
  related_draft?: number;
  related_comment?: number;
  is_read: boolean;
  created_at: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface CreateEntryDraftRequest {
  entry: number;
  content: string;
}

export interface CreateCommentRequest {
  draft_id: number;
  parent?: number;
  text: string;
}

// Enhanced EntryDraft with Entry details for review context
export interface ReviewDraft {
  id: number;
  entry: Entry;
  content: string;
  author: User;
  timestamp: string;
  approvers: User[];
  requested_reviewers: User[];
  is_approved: boolean;
  approval_count: number;
  is_published: boolean;
  status?: string;
  replaces_draft?: EntryDraft;
  // New user-centric fields from backend
  can_approve_by_current_user?: boolean;
  approval_status_for_user?:
    | 'unknown'
    | 'own_draft'
    | 'already_approved'
    | 'already_approved_by_others'
    | 'can_approve';
  user_has_approved?: boolean;
  remaining_approvals?: number;
  approval_percentage?: number;
  created_at: string;
  updated_at: string;
}

// New interfaces for backend enhancements
export interface GroupedEntry {
  term: Term;
  entries: Entry[];
}

export interface SystemConfig {
  MIN_APPROVALS: number;
  DEBUG: boolean;
}

export interface CreateTermAndEntryRequest {
  term_text: string;
  perspective_id: number;
  is_official?: boolean;
}

export interface EntryLookupResponse {
  entry_id: number | null;
  has_published_draft: boolean;
  has_unpublished_draft: boolean;
  unpublished_draft_author_id: number | null;
  is_new: boolean;
  term: Term;
  perspective: Perspective;
  entry?: Entry;
}

export interface CreateEntryRequest {
  term_id?: number;
  term_text?: string;
  perspective_id: number;
  is_official?: boolean;
}
