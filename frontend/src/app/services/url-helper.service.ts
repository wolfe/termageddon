import { Injectable } from '@angular/core';
import { Entry, ReviewDraft } from '../models';

@Injectable({
  providedIn: 'root',
})
export class UrlHelperService {

  /**
   * Build entry URL with optional query parameters
   */
  buildEntryUrl(entryId: number, entry?: Entry, includeQueryParams: boolean = true): string {
    let url = `/entry/${entryId}`;
    
    if (includeQueryParams && entry) {
      const queryParams = this.buildQueryParams(entry);
      if (queryParams) {
        url += `?${queryParams}`;
      }
    }
    
    return url;
  }

  /**
   * Build draft URL with optional query parameters
   */
  buildDraftUrl(draftId: number, draft?: ReviewDraft, includeQueryParams: boolean = true): string {
    let url = `/draft/${draftId}`;
    
    if (includeQueryParams && draft && draft.entry) {
      const queryParams = this.buildQueryParams(draft.entry);
      if (queryParams) {
        url += `?${queryParams}`;
      }
    }
    
    return url;
  }

  /**
   * Build edit entry URL
   */
  buildEditEntryUrl(entryId: number, entry?: Entry, includeQueryParams: boolean = true): string {
    let url = `/entry/${entryId}/edit`;
    
    if (includeQueryParams && entry) {
      const queryParams = this.buildQueryParams(entry);
      if (queryParams) {
        url += `?${queryParams}`;
      }
    }
    
    return url;
  }

  /**
   * Build query parameters from entry data
   */
  private buildQueryParams(entry: Entry): string {
    const params: string[] = [];
    
    if (entry.term) {
      params.push(`term=${this.normalizeTermForUrl(entry.term.text)}`);
    }
    
    if (entry.perspective) {
      params.push(`perspective=${this.normalizePerspectiveForUrl(entry.perspective.name)}`);
    }
    
    return params.join('&');
  }

  /**
   * Normalize term text for URL usage
   */
  normalizeTermForUrl(termText: string): string {
    return encodeURIComponent(termText.toLowerCase().trim());
  }

  /**
   * Normalize perspective name for URL usage
   */
  normalizePerspectiveForUrl(perspectiveName: string): string {
    return encodeURIComponent(perspectiveName.toLowerCase().trim());
  }

  /**
   * Parse query parameters from URL
   */
  parseQueryParams(queryParams: any): { term?: string; perspective?: string } {
    const result: { term?: string; perspective?: string } = {};
    
    if (queryParams && queryParams['term']) {
      result.term = decodeURIComponent(queryParams['term']);
    }
    
    if (queryParams && queryParams['perspective']) {
      result.perspective = decodeURIComponent(queryParams['perspective']);
    }
    
    return result;
  }
}
