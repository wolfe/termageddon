import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { PaginatedResponse } from '../models';

export interface PaginationState<T> {
  currentPage: number;
  hasNextPage: boolean;
  nextPageUrl: string | null;
  items: T[];
}

@Injectable({
  providedIn: 'root',
})
export class PaginationService {
  /**
   * Extract page number from a pagination URL
   */
  extractPageFromUrl(url: string | null): number {
    if (!url) return 1;
    try {
      const urlParams = new URLSearchParams(url.split('?')[1] || '');
      const nextPage = urlParams.get('page');
      return nextPage ? parseInt(nextPage, 10) - 1 : 1;
    } catch {
      return 1;
    }
  }

  /**
   * Update pagination state from a paginated response
   */
  updatePaginationState<T>(
    state: PaginationState<T>,
    response: PaginatedResponse<T>,
    reset: boolean
  ): PaginationState<T> {
    const newState: PaginationState<T> = {
      ...state,
      hasNextPage: !!response.next,
      nextPageUrl: response.next,
    };

    if (response.next) {
      newState.currentPage = this.extractPageFromUrl(response.next);
    } else {
      newState.currentPage = reset ? 1 : state.currentPage + 1;
    }

    if (reset) {
      newState.items = response.results;
      newState.currentPage = 1;
    } else {
      newState.items = [...state.items, ...response.results];
    }

    return newState;
  }

  /**
   * Initialize pagination state
   */
  createInitialState<T>(): PaginationState<T> {
    return {
      currentPage: 1,
      hasNextPage: false,
      nextPageUrl: null,
      items: [],
    };
  }

  /**
   * Reset pagination state
   */
  resetState<T>(state: PaginationState<T>): PaginationState<T> {
    return {
      ...state,
      currentPage: 1,
      hasNextPage: false,
      nextPageUrl: null,
      items: [],
    };
  }
}
