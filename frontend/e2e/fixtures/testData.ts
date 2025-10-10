export const TEST_USERS = {
  ADMIN: { 
    username: 'admin', 
    password: 'admin',
    firstName: 'Admin',
    lastName: 'User',
    isStaff: true
  },
  MARIA_CARTER: { 
    username: 'mariacarter', 
    password: 'mariacarter',
    firstName: 'Maria',
    lastName: 'Carter',
    perspectives: ['Physics', 'Chemistry']
  },
  BEN_CARTER: { 
    username: 'bencarter', 
    password: 'bencarter',
    firstName: 'Ben',
    lastName: 'Carter',
    perspectives: ['Chemistry', 'Biology']
  },
  SOFIA_ROSSI: { 
    username: 'sofiarossi', 
    password: 'sofiarossi',
    firstName: 'Sofia',
    lastName: 'Rossi',
    perspectives: ['Computer Science', 'Graph Theory']
  },
  LEO_SCHMIDT: { 
    username: 'leoschmidt', 
    password: 'leoschmidt',
    firstName: 'Leo',
    lastName: 'Schmidt',
    perspectives: ['Biology', 'Geology']
  },
  KENJI_TANAKA: { 
    username: 'kenjitanaka', 
    password: 'kenjitanaka',
    firstName: 'Kenji',
    lastName: 'Tanaka',
    perspectives: ['Physics', 'Geology']
  }
} as const;

export const TEST_TERMS = {
  ABSORPTION: 'absorption',
  MOLECULE: 'molecule',
  ALGORITHM: 'algorithm',
  PHOTOSYNTHESIS: 'photosynthesis',
  EROSION: 'erosion',
  QUANTUM: 'quantum',
  GRAPH: 'graph',
  CELL: 'cell',
  ROCK: 'rock',
  WAVE: 'wave'
} as const;

export const TEST_PERSPECTIVES = {
  PHYSICS: 'Physics',
  CHEMISTRY: 'Chemistry',
  BIOLOGY: 'Biology',
  COMPUTER_SCIENCE: 'Computer Science',
  GEOLOGY: 'Geology',
  GRAPH_THEORY: 'Graph Theory'
} as const;

export const TEST_DEFINITIONS = {
  ABSORPTION: 'The process by which one substance takes in another substance.',
  MOLECULE: 'A group of atoms bonded together, representing the smallest fundamental unit of a chemical compound.',
  ALGORITHM: 'A set of rules or instructions given to a computer to help it solve problems.',
  PHOTOSYNTHESIS: 'The process by which plants use sunlight to synthesize foods with the help of chlorophyll.',
  EROSION: 'The process of eroding or being eroded by wind, water, or other natural agents.',
  QUANTUM: 'Relating to or denoting the quantum theory of matter and energy.',
  GRAPH: 'A diagram that shows the relationship between variables.',
  CELL: 'The smallest structural and functional unit of an organism.',
  ROCK: 'A solid mineral material forming part of the surface of the earth.',
  WAVE: 'A disturbance that transfers energy through matter or space.'
} as const;

export const TEST_CONTENT = {
  VALID_DEFINITION: 'This is a valid test definition for automated testing purposes.',
  LONG_DEFINITION: 'This is a very long test definition that contains multiple sentences and should be used to test the behavior of the system when dealing with longer content. It includes various punctuation marks and should properly handle line breaks and formatting.',
  HTML_CONTENT: '<p>This definition contains <strong>HTML</strong> formatting and <em>should</em> be properly rendered.</p>',
  SPECIAL_CHARACTERS: 'This definition contains special characters: @#$%^&*()_+-=[]{}|;:,.<>?',
  MULTILINE: `This is a multiline definition.
It contains multiple paragraphs.

Each paragraph should be properly formatted.`
} as const;

export const TEST_MESSAGES = {
  LOGIN_SUCCESS: 'Login successful',
  LOGIN_ERROR: 'Invalid username or password',
  SAVE_SUCCESS: 'Definition saved successfully',
  SAVE_ERROR: 'Failed to save definition',
  APPROVAL_SUCCESS: 'Definition approved successfully',
  PUBLISH_SUCCESS: 'Definition published successfully',
  ENDORSEMENT_SUCCESS: 'Definition endorsed successfully',
  VALIDATION_ERROR: 'Please fill in all required fields',
  NETWORK_ERROR: 'Network error occurred',
  UNAUTHORIZED: 'You are not authorized to perform this action'
} as const;

export const TEST_TIMEOUTS = {
  SHORT: 5000,
  MEDIUM: 10000,
  LONG: 30000,
  VERY_LONG: 60000
} as const;

export const TEST_SELECTORS = {
  LOGIN_FORM: '[data-testid="username-input"], [data-testid="password-input"], [data-testid="login-submit-button"]',
  TERM_LIST: '[data-testid="term-name"]',
  TERM_DETAIL: '[data-testid="term-edit-button"], [data-testid="term-save-button"], [data-testid="term-content"]',
  REVIEW_DASHBOARD: '[data-testid="version-item"], [data-testid="approve-button"], [data-testid="publish-button"]',
  LOADING_INDICATORS: '.animate-spin, text=Loading...',
  ERROR_MESSAGES: '.text-orange-600, .bg-orange-100',
  SUCCESS_MESSAGES: '.bg-green-100, .bg-green-400'
} as const;

export const TEST_URLS = {
  LOGIN: '/login',
  HOME: '/',
  REVIEW: '/review',
  TERM_DETAIL: (termId: string) => `/term/${termId}`,
  REVIEW_DETAIL: (versionId: string) => `/review/${versionId}`
} as const;

export const TEST_NAVIGATION = {
  FROM_LOGIN_TO_HOME: 'Should redirect to home page after successful login',
  FROM_HOME_TO_REVIEW: 'Should navigate to review page from home',
  FROM_TERM_TO_DETAIL: 'Should navigate to term detail page when clicking term',
  FROM_REVIEW_TO_APPROVAL: 'Should navigate to approval workflow from review page'
} as const;

export const TEST_WORKFLOWS = {
  LOGIN_WORKFLOW: 'User logs in with valid credentials',
  TERM_CREATION_WORKFLOW: 'User creates a new term with definition',
  TERM_EDITING_WORKFLOW: 'User edits an existing term definition',
  APPROVAL_WORKFLOW: 'User approves a pending term definition',
  PUBLISHING_WORKFLOW: 'User publishes an approved term definition',
  ENDORSEMENT_WORKFLOW: 'User endorses a term definition',
  PERSPECTIVE_SWITCHING_WORKFLOW: 'User switches between different perspective contexts',
  SEARCH_WORKFLOW: 'User searches for terms using various filters'
} as const;

export const TEST_VALIDATION = {
  REQUIRED_FIELDS: {
    USERNAME: 'Username is required',
    PASSWORD: 'Password is required',
    TERM_NAME: 'Term name is required',
    DEFINITION: 'Definition content is required'
  },
  INVALID_INPUT: {
    TOO_SHORT: 'Input is too short',
    TOO_LONG: 'Input is too long',
    INVALID_FORMAT: 'Invalid format',
    SPECIAL_CHARACTERS: 'Special characters not allowed'
  },
  BUSINESS_RULES: {
    CANNOT_APPROVE_OWN: 'Cannot approve your own definition',
    ALREADY_APPROVED: 'Already approved by you',
    NOT_ELIGIBLE: 'Not eligible to approve',
    INSUFFICIENT_PERMISSIONS: 'Insufficient permissions'
  }
} as const;
