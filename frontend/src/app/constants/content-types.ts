/**
 * Content Type IDs for Django ContentType model
 * These correspond to the IDs in the database for different models
 */
export const CONTENT_TYPES = {
  // Django admin log entry
  ADMIN_LOG_ENTRY: 1,
  
  // Auth models
  PERMISSION: 2,
  GROUP: 3,
  USER: 4,
  
  // Content types
  CONTENT_TYPE: 5,
  SESSION: 6,
  
  // Auth token
  TOKEN: 7,
  TOKEN_PROXY: 8,
  
  // Glossary models
  COMMENT: 9,
  ENTRY: 10,
  ENTRY_DRAFT: 11,
  PERSPECTIVE: 12,
  PERSPECTIVE_CURATOR: 13,
  TERM: 14,
} as const;

export type ContentTypeId = typeof CONTENT_TYPES[keyof typeof CONTENT_TYPES];
