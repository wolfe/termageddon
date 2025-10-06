# TODO - E2E Test Issues

## Issue 1: Version Creation Logic
**File**: `e2e/edit-during-approval.spec.ts:132`
**Test**: "should prevent creating new version when unpublished exists"
**Problem**: Test expects to see "Second version for validation test." text but it's not appearing
**Status**: Needs investigation - likely a code bug in version creation/update logic
