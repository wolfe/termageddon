export interface User {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  is_staff: boolean;
  domain_expert_for?: number[];
}

export interface Domain {
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

export interface EntryVersion {
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
  created_at: string;
  updated_at: string;
}

export interface Entry {
  id: number;
  term: Term;
  domain: Domain;
  active_version?: EntryVersion;
  is_official: boolean;
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

export interface DomainExpert {
  id: number;
  user: User;
  user_id?: number;
  domain: Domain;
  domain_id?: number;
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

export interface CreateEntryVersionRequest {
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

// Enhanced EntryVersion with Entry details for review context
export interface ReviewVersion {
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
  replaces_version?: EntryVersion;
  created_at: string;
  updated_at: string;
}
