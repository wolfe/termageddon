# Code Review Checklist

A comprehensive checklist for reviewing code changes in the Termageddon project.

## Pre-Review Checklist
- [ ] All tests pass (`pytest` for backend, `ng test` for frontend)
- [ ] Code is formatted with Black (Python) and Prettier (TypeScript/SCSS)
- [ ] No trailing whitespace on lines
- [ ] No console.log statements left in production code
- [ ] No hardcoded credentials or sensitive data

## Backend (Django) Review Points

### Models & Database
- [ ] Models follow Django conventions and use proper field types
- [ ] Soft delete is implemented correctly (inherits from AuditedModel)
- [ ] Database queries are optimized (no N+1 queries)
- [ ] Proper use of `select_related` and `prefetch_related`
- [ ] Migrations are included and tested

### API & Views
- [ ] ViewSets follow REST conventions
- [ ] Proper authentication and permissions
- [ ] Input validation using serializers
- [ ] Error handling is comprehensive
- [ ] API responses are consistent
- [ ] Pagination is implemented where needed

### Business Logic
- [ ] Approval workflow logic is correct (2 approvals required)
- [ ] Authors cannot approve their own drafts
- [ ] Perspective curator permissions are enforced
- [ ] Comment threading works properly
- [ ] Soft delete behavior is consistent

## Frontend (Angular) Review Points

### Components & Architecture
- [ ] Components are standalone (Angular 17)
- [ ] OnPush change detection used where appropriate
- [ ] Proper lifecycle hook implementation
- [ ] Components are focused on presentation
- [ ] Business logic is in services

### Styling & UI
- [ ] Uses Tailwind CSS with Termageddon theme
- [ ] Semantic color naming (status-*, action-*, role-*)
- [ ] Responsive design considerations
- [ ] Accessibility attributes included
- [ ] Consistent spacing and typography

### State Management
- [ ] Services use BehaviorSubject for state
- [ ] HTTP calls are properly handled
- [ ] Error states are managed
- [ ] Loading states are implemented
- [ ] Token authentication is secure

## Code Quality

### General
- [ ] Constants before expressions in binary operations
- [ ] Meaningful variable and function names
- [ ] Minimal, helpful comments
- [ ] No code duplication
- [ ] Opportunities for code unification identified

### TypeScript/Python
- [ ] Proper type annotations
- [ ] Interfaces defined for complex objects
- [ ] Error handling is comprehensive
- [ ] Edge cases are considered

## Security Review
- [ ] Input validation on both frontend and backend
- [ ] XSS prevention (HTML sanitization)
- [ ] CSRF protection where needed
- [ ] Authentication tokens handled securely
- [ ] No sensitive data in client-side code

## Performance Review
- [ ] Database queries are optimized
- [ ] Frontend components use trackBy in *ngFor
- [ ] Images are optimized
- [ ] Bundle size is reasonable
- [ ] Lazy loading implemented where beneficial

## Testing Review
- [ ] Unit tests cover new functionality
- [ ] Integration tests for API endpoints
- [ ] Test data uses factories
- [ ] Edge cases are tested
- [ ] Error scenarios are covered

## Documentation
- [ ] README updated if needed
- [ ] API documentation updated
- [ ] Code comments explain complex logic
- [ ] Commit messages are descriptive

## Deployment Considerations
- [ ] Environment variables are used for configuration
- [ ] Static files are handled correctly
- [ ] Database migrations are safe
- [ ] CORS settings are appropriate
- [ ] Production settings are secure

## Termageddon-Specific
- [ ] Approval workflow maintains data integrity
- [ ] Comment system threading works correctly
- [ ] Rich text editor content is properly sanitized
- [ ] Internal linking between terms functions
- [ ] Perspective curator permissions are respected
- [ ] Draft history is maintained correctly
