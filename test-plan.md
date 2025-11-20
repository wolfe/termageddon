<!-- 894733fc-a3f8-4489-9c0b-0f13b4412bff 61584859-a60c-4458-a67a-46563f9fd900 -->

# Manual Browser Testing Plan for Termageddon

## Test Environment Setup

### Prerequisites

- Backend running on `http://localhost:8000`
- Frontend running on `http://localhost:4200`
- Browser: Chrome (recommended)
- Test credentials available (see USER_GUIDE.md)

### Test Users

**Note:** For most testing, use non-admin test users. The admin user is primarily for initial login setup and admin-specific functionality testing.

- **Admin:** `admin` / `admin` (use mainly for initial setup)
- **Test Users (password = ImABird):**
  - `mariacarter` / `ImABird` - Perspective Curator (Physics, Chemistry)
  - `bencarter` / `ImABird` - Perspective Curator (Chemistry, Biology)
  - `leoschmidt` / `ImABird` - Perspective Curator (Biology, Geology)
  - `kenjitanaka` / `ImABird` - Perspective Curator (Physics, Geology)
  - `sofiarossi` / `ImABird` - Perspective Curator (Computer Science, Graph Theory)
  - `aishakhan` / `ImABird` - Regular User
  - `samuelgreene` / `ImABird` - Regular User
  - `ivanpetrov` / `ImABird` - Regular User
  - `chloedubois` / `ImABird` - Regular User
  - `evelynreed` / `ImABird` - Regular User (not a test user, but uses same password)

**Perspective Curator assignments:** Vary by perspective - check backend for specific assignments.

### User Switching (Recommended for Testing)

To switch between test users without logging out:

1. Click on your user name in the top-right corner of the navigation bar
2. A dropdown will appear showing all available test users
3. Click on the desired user to switch
4. The page will reload with the new user context

**Note:** User switching is only available for test users. Use this instead of logging out and back in to speed up testing and maintain session state.

## Test Areas

### 1. Authentication & Navigation

- [ ] Login with valid credentials (initial setup - use admin or any test user)
- [ ] Login with invalid credentials (error handling)
- [ ] User switching functionality (use instead of logout/login for faster testing)
  - [ ] Click user name in top-right corner to open switcher dropdown
  - [ ] Dropdown shows all available test users
  - [ ] Can switch to different test user
  - [ ] Page reloads with new user context
  - [ ] Current user is highlighted in dropdown
- [ ] Logout functionality (only needed for final cleanup or testing logout flow)
- [ ] Navigation between Glossary, Review Dashboard, My Drafts
- [ ] URL persistence when navigating
- [ ] Browser back/forward buttons work correctly
- [ ] Direct URL navigation works (e.g., `/my-drafts?draftId=123`)

### 2. Glossary View

#### Search & Filtering

- [ ] Search by term name (case-insensitive, partial matches)
- [ ] Filter by perspective
- [ ] Filter by approval status (All, Approved, Pending, No Draft)
- [ ] Filter by author
- [ ] Filter by official status
- [ ] Sort by term name (A-Z, Z-A)
- [ ] Sort by creation date
- [ ] Sort by last updated
- [ ] Clear filters button
- [ ] Active filter count display
- [ ] Search results update as you type

#### Term Selection & Display

- [ ] Select term from sidebar
- [ ] Term details display correctly
- [ ] Status badges display (Official, Pending, Draft)
- [ ] Approvers avatars display
- [ ] Rich text content renders correctly
- [ ] Author and timestamp display
- [ ] Version history sidebar opens/closes
- [ ] Historical draft selection works
- [ ] Entry links in content navigate correctly

#### Definition Linking (RECENTLY FIXED - VERIFY)

- [ ] Custom link button (📖) appears in editor toolbar
- [ ] Clicking custom link button opens entry selector dialog
- [ ] Can select existing term to link to
- [ ] Link is inserted with book icon (📖)
- [ ] Link navigates to linked term when clicked
- [ ] Links persist after saving
- [ ] Links display correctly in view mode
- [ ] Links work after page refresh
- [ ] Links work in all three views (Glossary, Review, My Drafts)

#### Editing

- [ ] Edit button appears for authorized users
- [ ] Editor opens with current content
- [ ] Can format text (bold, italic, underline)
- [ ] Can add blockquotes and code blocks
- [ ] Can create ordered and bullet lists
- [ ] Can adjust indentation
- [ ] Can align text
- [ ] Can add standard links
- [ ] Can add custom term links (see Definition Linking above)
- [ ] Can clean formatting
- [ ] Save changes works
- [ ] Cancel edit works
- [ ] Changes persist after save
- [ ] Editor content is sanitized properly

#### Comments

- [ ] Comments section displays
- [ ] Can add new comment
- [ ] Comment appears in UI (verify no duplication)
- [ ] Can reply to comment
- [ ] Can resolve/unresolve comment
- [ ] Comments persist after page refresh
- [ ] Comments load correctly on page refresh
- [ ] Comment author and timestamp display
- [ ] Draft position indicators work (if applicable)

### 3. Review Dashboard

#### Draft List

- [ ] Drafts list loads correctly
- [ ] Search works in draft list
- [ ] Filters work (perspective, status, etc.)
- [ ] Draft selection works
- [ ] Draft details display correctly
- [ ] Status summary displays correctly

#### Approval Workflow

- [ ] Approve button appears for eligible drafts
- [ ] Approve action works
- [ ] Draft disappears from list after approval
- [ ] Request Review button works
- [ ] Reviewer selector dialog opens/closes
- [ ] Can select multiple reviewers
- [ ] Review request is sent successfully
- [ ] Status updates after actions
- [ ] Approval count updates correctly

#### Comments (RECENTLY FIXED - VERIFY)

- [ ] Comments section displays
- [ ] Can add new comment
- [ ] **VERIFY: Comment appears only once (not duplicated)**
- [ ] **VERIFY: Comments load after page refresh**
- [ ] Can reply to comment
- [ ] Can resolve/unresolve comment
- [ ] Comments persist correctly
- [ ] Comment count updates correctly

### 4. My Drafts View

#### Draft Management

- [ ] Personal drafts list loads
- [ ] Search works
- [ ] Filters work (perspective, sort)
- [ ] Draft selection works
- [ ] Draft details display correctly
- [ ] Can delete draft (with confirmation)
- [ ] Can publish draft (when eligible)
- [ ] Status summary displays correctly

#### Editing

- [ ] Edit button works
- [ ] Editor opens with latest draft content
- [ ] Can save changes
- [ ] New draft is created on save
- [ ] Draft history updates after save
- [ ] Edit mode can be triggered via URL parameter (`?edit=true`)

#### Comments (RECENTLY FIXED - CRITICAL)

- [ ] Comments section displays
- [ ] Can add new comment
- [ ] **VERIFY: Comment appears only once (not duplicated)**
- [ ] **VERIFY: Comments load after page refresh**
- [ ] Can reply to comment
- [ ] Can resolve/unresolve comment
- [ ] Comments persist correctly
- [ ] Comment count updates correctly
- [ ] Loading indicator shows while comments load

#### URL Parameters

- [ ] Draft ID in URL loads correct draft
- [ ] Edit mode parameter works (`?edit=true`)
- [ ] URL updates when selecting draft
- [ ] Browser refresh maintains selection
- [ ] Comments load when navigating via URL

### 5. Cross-View Functionality

#### Comments (All Views)

- [ ] Comments work consistently across Glossary, Review, My Drafts
- [ ] No duplication when adding comment
- [ ] Comments load on refresh in all views
- [ ] Comment threading works (replies)
- [ ] Comment resolution works
- [ ] Comment author information displays
- [ ] Comment timestamps display correctly

#### Entry Links

- [ ] Links work in all views
- [ ] Links navigate correctly
- [ ] Links maintain context (stay in same view if possible)
- [ ] Links work after page refresh

#### Version History

- [ ] Version history sidebar works in all views
- [ ] Can select historical draft
- [ ] Historical draft displays correctly
- [ ] Can compare versions (if implemented)

### 6. Error Handling

- [ ] Network errors display user-friendly messages
- [ ] 401 errors redirect to login
- [ ] 403 errors show permission message
- [ ] 404 errors handled gracefully
- [ ] Validation errors display inline
- [ ] Form validation works
- [ ] Error messages are clear and actionable

### 7. Edge Cases

- [ ] Empty draft list
- [ ] Term with no definition
- [ ] Term with multiple drafts
- [ ] Very long term names/content
- [ ] Special characters in content
- [ ] Rapid clicking/actions (debouncing)
- [ ] Multiple browser tabs
- [ ] Browser refresh during edit
- [ ] Browser refresh with draft selected
- [ ] Browser refresh with comment just added
- [ ] Very long comments
- [ ] Many comments (pagination if applicable)

## Known Bugs to Address

### Critical Bugs (Must Fix)

1. **Comments don't load on page refresh (My Drafts view)**

- **Status:** Under investigation
- **Description:** After posting a comment and refreshing the page, comments don't appear
- **Steps to Reproduce:**

1.  Go to My Drafts view
2.  Select a draft
3.  Add a comment
4.  Refresh the page
5.  Comments don't load

- **Expected:** Comments should load from server on refresh
- **Actual:** Comments section is empty
- **Root Cause:** May be related to `selectDraft()` not being called on refresh, or timing issue with component initialization
- **Priority:** CRITICAL

2. **Comments appear twice when added (My Drafts view)**

- **Status:** Fixed (needs verification)
- **Description:** When adding a comment, it appears twice in the UI
- **Steps to Reproduce:**

1.  Go to My Drafts view
2.  Select a draft
3.  Add a comment
4.  Comment appears twice

- **Expected:** Comment should appear once
- **Actual:** Comment appears twice
- **Fix Applied:** Removed base class comment loading, using only input comments
- **Verification Needed:** Test to confirm fix works
- **Priority:** CRITICAL

### High Priority Bugs

3. **Comments may not load when draft is selected from URL**

- **Status:** Suspected issue
- **Description:** When navigating directly to a draft via URL, comments may not load
- **Steps to Reproduce:**

1.  Navigate to `/my-drafts?draftId=123`
2.  Check if comments load

- **Expected:** Comments should load automatically
- **Actual:** May not load
- **Priority:** HIGH

4. **Definition linking button missing from toolbar**

- **Status:** Fixed (needs verification)
- **Description:** Custom link button (📖) was missing from editor toolbar
- **Fix Applied:** Added 'custom-link' back to toolbar configuration
- **Verification Needed:** Test that button appears and works
- **Priority:** HIGH

### Medium Priority Bugs

5. **No loading indicator for comments**

- **Description:** When comments are loading, no visual feedback
- **Enhancement:** Add loading spinner or skeleton
- **Priority:** MEDIUM

6. **No error message if comment creation fails**

- **Description:** If comment creation fails, error may not be visible
- **Enhancement:** Ensure error messages are displayed
- **Priority:** MEDIUM

7. **Comment count not updating in real-time**

- **Description:** Comment count may not update immediately
- **Priority:** MEDIUM

### Low Priority / Enhancement Requests

8. **Editor undo/redo not implemented**

- **Description:** Editor lacks undo/redo functionality
- **Reference:** TODO.md mentions this
- **Priority:** LOW

9. **No keyboard shortcuts**

- **Description:** No keyboard shortcuts for common actions
- **Reference:** TODO.md mentions this
- **Priority:** LOW

10. **No draft comparison view**

- **Description:** Cannot compare draft versions side-by-side
- **Reference:** TODO.md mentions this
- **Priority:** LOW

## Testing Checklist Summary

### Critical Path Testing (Do First)

1. ✅ Definition linking button appears and works
2. ✅ Comments don't duplicate when added
3. ✅ Comments load on page refresh
4. ✅ Comments work in all three views
5. ✅ Basic CRUD operations work

### Full Regression Testing

- Complete all test areas above
- Verify all recently fixed bugs
- Test edge cases
- Verify error handling

## Test Execution Notes

- **Use user switching instead of logout/login** to maintain test session state and speed up testing
- Record any additional bugs found during testing
- Document steps to reproduce any new issues
- Note performance issues or slow operations

### To-dos

- [x] Add 'custom-link' back to the toolbar container array in definition-form.component.ts
- [x] Update the test to reflect that 'custom-link' is now in the toolbar container
