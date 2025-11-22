import DiffMatchPatch from 'diff-match-patch';

/**
 * Diff utility for comparing HTML content between drafts
 */
export interface DiffResult {
  html: string;
  hasChanges: boolean;
}

/**
 * Compare two HTML strings and return HTML with diff highlighting
 * @param oldHtml - The older HTML content
 * @param newHtml - The newer HTML content
 * @returns HTML string with diff highlighting (additions in green, deletions in red/strikethrough)
 */
export function diffHtml(oldHtml: string, newHtml: string): DiffResult {
  if (!oldHtml && !newHtml) {
    return { html: '', hasChanges: false };
  }

  if (!oldHtml) {
    // Only new content - all additions
    return {
      html: `<span class="diff-add">${escapeHtml(newHtml)}</span>`,
      hasChanges: true,
    };
  }

  if (!newHtml) {
    // Only old content - all deletions
    return {
      html: `<span class="diff-del">${escapeHtml(oldHtml)}</span>`,
      hasChanges: true,
    };
  }

  // Use diff-match-patch for HTML-aware diffing
  const dmp = new DiffMatchPatch();

  // Strip HTML tags for better diffing, but preserve structure
  const oldText = stripHtmlTags(oldHtml);
  const newText = stripHtmlTags(newHtml);

  const diffs = dmp.diff_main(oldText, newText);
  dmp.diff_cleanupSemantic(diffs);

  let resultHtml = '';
  let hasChanges = false;

  for (const [operation, text] of diffs) {
    const escapedText = escapeHtml(text);

    if (operation === 0) {
      // No change
      resultHtml += escapedText;
    } else if (operation === -1) {
      // Deletion
      resultHtml += `<span class="diff-del">${escapedText}</span>`;
      hasChanges = true;
    } else if (operation === 1) {
      // Addition
      resultHtml += `<span class="diff-add">${escapedText}</span>`;
      hasChanges = true;
    }
  }

  return { html: resultHtml, hasChanges };
}

/**
 * Strip HTML tags from content for diffing
 */
function stripHtmlTags(html: string): string {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
