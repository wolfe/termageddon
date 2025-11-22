# Termageddon - Future Work

## Priority 1: High-Impact Improvements

### Security & Performance
- [Y] Add security headers and CSRF protection enhancements

## Priority 2: Feature Enhancements

### Search & Discovery
- [Y] Implement full-text search across definitions and comments.  Use the same search as now, but highlight those matches whose terms are prefixed with what is being typed
- [ ] Create search suggestions and autocomplete

### Data Management
- [Y] Implement data archiving for old drafts

### User Experience
- [Y] Create draft comparison/diff view (inline):  When displaying the draft (i.e., read view) indicate text changes with highlighting
- [ ] Implement dark mode theme

## Priority 3: Advanced Features

### Collaboration
- [Y] Add @mentions in comments to notify specific users
- [Y] Implement simple comment reactions (Just thumbs up)
- [ ] Implement follow/watch terms for updates  (Susan likes; David not so sure)
- [Y] Implement in-app notifications:  Add notification tab (notified if my drafts get edits; my drafts get approvals; people @comment me; people requested my approval); ability to individually dismiss notifications

### Integration & API
- [ ] Add OAuth2 authentication which will integrate with our corporate Okta account
- [Y] Build API documentation portal (Swagger)

## Technical Debt & Maintenance

- [ ] Refactor backend to fully use perspective/curator/draft terminology in code
- [ ] Update database schema to match current naming conventions
- [ ] Consolidate duplicate code in frontend services
- [ ] Improve error handling consistency across backend and frontend
- [ ] Create developer onboarding guide
- [ ] Implement automated dependency updates

## Refactor comment functionality:  The only purposes of comments is to help with the drafting process.

- [Y] Update the data model so that comments are only associated with Entry Drafts; do not use generic Content type.
- [Y] By default, you see the top-level comments on an Entry which are on drafts since the last published entry.  For those drafts without a published entry, all comments are shown.
- [Y] The comments on the draft currently being viewed are highlighted
- [Y] When viewing Version History, the left sidebar shows the number of comments on each item
- [Y] When selecting a view from the version history and the history tab is open, you cannot comment; you see only those comment threads which are associated with that particular draft (though replies might have been to another draft; that's okay).  This is the mechanism to view old comments, for example, pre-dating last publish.  The resolved comments are also visible here.
- [Y] The Glossary view does not show comments at all (unless you open out the Version History).  If you want to comment, you have to open a draft.
- [Y] In Review and My Draft views (i.e., not the Vesion History) there is a button "3 resolved" which, when clicked, show the resolved comments.
- [Y] In Version History view, the resolved comments are shown.
- [Y] Add the ability to edit your own comments

## Nice-to-Have Features

- [ ] Implement AI-powered definition suggestions
- [ ] Create browser extension for quick term lookups
