export interface User {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  is_staff: boolean;
  perspective_curator_for?: number[];
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
  is_approved: boolean;
  approval_count: number;
  is_published: boolean;
  is_endorsed: boolean;
  // New user-centric fields from backend
  can_approve_by_current_user?: boolean;
  approval_status_for_user?: 'unknown' | 'own_draft' | 'already_approved' | 'already_approved_by_others' | 'can_approve';
  user_has_approved?: boolean;
  remaining_approvals?: number;
  approval_percentage?: number;
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
  content_type: number;
  object_id: number;
  parent?: number;
  text: string;
  author: User;
  is_resolved: boolean;
  replies: Comment[];
  created_at: string;
  updated_at: string;
}

export interface PerspectiveCurator {
  id: number;
  user: User;
  user_id?: number;
  perspective: Perspective;
  perspective_id?: number;
  assigned_by?: User;
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
  author: number;
}

export interface CreateCommentRequest {
  content_type: number;
  object_id: number;
  parent?: number;
  text: string;
  author: number;
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
  replaces_draft?: EntryDraft;
  // New user-centric fields from backend
  can_approve_by_current_user?: boolean;
  approval_status_for_user?: 'unknown' | 'own_draft' | 'already_approved' | 'already_approved_by_others' | 'can_approve';
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
