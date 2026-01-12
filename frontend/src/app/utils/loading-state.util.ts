
/**
 * Utility for managing loading and error states
 */
export interface LoadingState {
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
}

/**
 * Create initial loading state
 */
export function createLoadingState(): LoadingState {
  return {
    isLoading: false,
    isLoadingMore: false,
    error: null,
  };
}

/**
 * Reset loading state (for new loads)
 */
export function resetLoadingState(state: LoadingState): LoadingState {
  return {
    ...state,
    isLoading: true,
    isLoadingMore: false,
    error: null,
  };
}

/**
 * Start loading more (for pagination)
 */
export function startLoadingMore(state: LoadingState): LoadingState {
  return {
    ...state,
    isLoadingMore: true,
  };
}

/**
 * Complete loading state
 */
export function completeLoadingState(state: LoadingState): LoadingState {
  return {
    ...state,
    isLoading: false,
    isLoadingMore: false,
  };
}

/**
 * Set error state
 */
export function setErrorState(state: LoadingState, error: string): LoadingState {
  return {
    ...state,
    isLoading: false,
    isLoadingMore: false,
    error,
  };
}
