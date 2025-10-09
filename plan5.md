<!-- 0d7eb936-fc61-4c57-9a94-533b84eea932 ffdf19cf-7e4b-44b7-b128-f09e11779a96 -->
# E2E Test Isolation and State Management

## Problem Summary

E2E tests lack independence and proper state management, causing tests to interfere with each other through shared database state, persistent mutations, and inadequate cleanup.

## Solution Overview

Implement a multi-layered approach to test isolation:

1. Database reset between test runs
2. Test fixtures for isolated data creation
3. Proper setup/teardown hooks
4. Authentication state management
5. Remove flaky patterns

## Implementation Plan

### 1. Database Reset Infrastructure

**Create global setup file**: `frontend/e2e/global-setup.ts`

- Reset and seed database before all tests
- Use Django management command to flush and reload test data
- Ensure clean starting state

**Create global teardown file**: `frontend/e2e/global-teardown.ts`

- Optional: Clean up any test artifacts
- Log test completion

**Update `playwright.config.ts`**

- Add `globalSetup` and `globalTeardown` references
- Consider setting `fullyParallel: false` or `workers: 1` for stability
- Add `testDir` specific configuration

### 2. API Helper Enhancement

**Enhance `frontend/e2e/helpers/api.ts`**

- Implement `setupTestData()` to create isolated test data via API
- Implement `cleanupTestData()` to delete created resources
- Add methods to:
  - Create test versions with specific states
  - Delete versions/entries by ID
  - Reset approval states
  - Get current database state
- Track created resources for cleanup

**Add database reset endpoint** (Backend)

- Create Django management command: `backend/glossary/management/commands/reset_test_db.py`
- Flush database and reload test data
- Can be called from global setup or per-suite

### 3. Test Fixtures System

**Create fixture helper**: `frontend/e2e/helpers/fixtures.ts`

- Factory functions to create:
  - Test terms with specific domains
  - Entry versions with specific approval states
  - User sessions with specific permissions
- Cleanup tracking for automatic teardown
- Isolated data per test using unique identifiers

**Pattern**: Each test creates its own data and cleans up after

### 4. Authentication State Management

**Update `AuthHelper`** in `frontend/e2e/helpers/auth.ts`

- Use Playwright's storage state feature
- Pre-authenticate users and save state to files
- Reuse auth state across tests to avoid repeated logins
- Add `setupAuthState()` method to create auth files in global setup

**Create auth state files**: Store in `frontend/e2e/.auth/`

- `admin.json`
- `mariacarter.json`
- `bencarter.json`
- etc.

**Update test files**

- Use `storageState` option in test configuration
- Remove redundant login calls in `beforeEach`

### 5. Cleanup Hooks

**Add `afterEach` hooks** to all test files

- Clean up created resources
- Reset modified state
- Clear any test-specific data

**Pattern for each test file**:

```typescript
let createdResources: string[] = [];

test.afterEach(async ({ page }) => {
  // Clean up resources created in this test
  const api = new ApiHelper(page);
  await api.cleanupResources(createdResources);
  createdResources = [];
});
```

### 6. Remove Flaky Patterns

**Replace `test.skip()` patterns**

- Instead of skipping when data doesn't exist, create the data
- Use fixtures to ensure required data exists
- Make tests deterministic

**Remove arbitrary timeouts**

- Replace `page.waitForTimeout(2000)` with proper API/DOM waits
- Use `page.waitForResponse()` for API calls
- Use `page.waitForSelector()` for DOM elements

**Fix search patterns**

- Don't loop through data looking for specific states
- Create data in the exact state needed
- Use fixtures to set up test scenarios

### 7. Test Data Isolation

**Update test data approach**

- Each test creates its own terms/versions with unique names
- Use test-specific prefixes (e.g., `test_${Date.now()}_absorption`)
- Clean up created data in `afterEach`

**Alternative: Database snapshots**

- Create SQLite snapshot after loading test data
- Restore snapshot before each test suite
- Faster than full reset but requires coordination

### 8. Configuration Updates

**Update `playwright.config.ts`**

```typescript
- fullyParallel: false (disable parallel execution)
- workers: 1 (single worker for simplicity)
- Add globalSetup and globalTeardown
- Increase timeouts if needed for setup/teardown
- Add retries: 0 for local development
```

**Rationale for single worker**

- Avoids complexity of database sharding
- Ensures complete test isolation
- Simpler cleanup and state management
- Tests run sequentially with predictable state

## Files to Create/Modify

### New Files

- `frontend/e2e/global-setup.ts`
- `frontend/e2e/global-teardown.ts`
- `frontend/e2e/helpers/fixtures.ts`
- `frontend/e2e/.auth/` (directory for auth states)
- `backend/glossary/management/commands/reset_test_db.py`

### Modified Files

- `frontend/playwright.config.ts`
- `frontend/e2e/helpers/api.ts`
- `frontend/e2e/helpers/auth.ts`
- All test spec files (add afterEach, remove skip patterns, use fixtures)
  - `frontend/e2e/auth.spec.ts`
  - `frontend/e2e/domain-reviewer.spec.ts`
  - `frontend/e2e/review-approval.spec.ts`
  - `frontend/e2e/review.spec.ts`
  - `frontend/e2e/reviewer-selection.spec.ts`
  - `frontend/e2e/term-management.spec.ts`

## Testing Strategy

1. Start with infrastructure (global setup, API helpers, fixtures)
2. Update one test file as proof of concept
3. Verify tests are isolated and repeatable
4. Apply pattern to remaining test files
5. Run full suite multiple times to verify stability

## Success Criteria

- Tests can run multiple times without failures
- Tests can run in any order
- Database state is predictable at test start
- No test.skip() due to missing/wrong data
- No arbitrary timeouts
- All created resources are cleaned up
- Tests are independent and isolated

### To-dos

- [ ] Create global setup/teardown files and database reset command
- [ ] Enhance ApiHelper with CRUD operations and cleanup tracking
- [ ] Create fixtures helper for isolated test data creation
- [ ] Implement authentication state management with storage states
- [ ] Add afterEach hooks to all test files for resource cleanup
- [ ] Remove test.skip() patterns and arbitrary timeouts, use fixtures instead
- [ ] Update playwright.config.ts with global setup and adjusted parallelism
- [ ] Update all test spec files to use new patterns and fixtures
- [ ] Run full test suite multiple times to verify isolation and stability