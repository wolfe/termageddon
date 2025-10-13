import { ReviewDraft } from '../models';

export function getDraftStatus(draft: ReviewDraft): string {
  if (draft.is_published) {
    return 'Published';
  } else if (draft.is_approved) {
    return 'Approved';
  } else if (draft.approval_count >= 2) {
    return 'Ready to Publish';
  } else {
    return `Pending (${draft.approval_count}/2)`;
  }
}

export function getDraftStatusClass(draft: ReviewDraft): string {
  if (draft.is_published) {
    return 'status-published';
  } else if (draft.is_approved) {
    return 'status-approved';
  } else if (draft.approval_count >= 2) {
    return 'status-ready';
  } else {
    return 'status-pending';
  }
}

export function getApprovalStatusText(draft: ReviewDraft): string {
  if (draft.is_approved) {
    return 'Approved';
  }
  return `${draft.approval_count}/2 Approvals`;
}

export function getEligibilityText(draft: ReviewDraft): string {
  const status = draft.approval_status_for_user ?? 'unknown';
  switch (status) {
    case 'own_draft':
      return 'Your draft';
    case 'already_approved':
      return 'Already approved';
    case 'can_approve':
      return 'Ready to approve';
    case 'already_approved_by_others':
      return 'Approved by others';
    default:
      return 'Unknown';
  }
}

export function getEligibilityClass(draft: ReviewDraft): string {
  const status = draft.approval_status_for_user ?? 'unknown';
  switch (status) {
    case 'own_draft':
      return 'text-ui-text-muted bg-ui-background-elevated';
    case 'already_approved':
      return 'text-status-published bg-status-published-light';
    case 'can_approve':
      return 'text-status-approved bg-status-approved-light';
    case 'already_approved_by_others':
      return 'text-status-published bg-status-published-light';
    default:
      return 'text-ui-text-muted bg-ui-background-elevated';
  }
}

export function getApprovalReason(draft: ReviewDraft, currentUserId?: number): string {
  if (!currentUserId) return 'Please log in to approve definitions';
  
  const status = draft.approval_status_for_user ?? 'unknown';
  
  switch (status) {
    case 'own_draft':
      return 'You cannot approve your own definition';
    case 'already_approved':
      return 'You have already approved this definition';
    case 'already_approved_by_others':
      return 'This definition has already been approved by others';
    case 'can_approve':
      return 'This definition is ready for your approval';
    case 'unknown':
      return 'Unable to determine approval status';
    default:
      return 'This definition cannot be approved at this time';
  }
}

export function canPublish(draft: ReviewDraft): boolean {
  return draft.is_approved && !draft.is_published;
}

export function canApprove(draft: ReviewDraft): boolean {
  return draft.can_approve_by_current_user ?? false;
}

export function getRemainingApprovals(draft: ReviewDraft): number {
  return draft.remaining_approvals ?? 0;
}

export function getApprovalAccessLevel(draft: ReviewDraft): string {
  return draft.approval_status_for_user ?? 'unknown';
}
