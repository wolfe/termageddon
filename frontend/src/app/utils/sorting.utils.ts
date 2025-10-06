/**
 * Utility functions for normalized sorting
 * Ensures consistent alphabetical sorting regardless of case and special characters
 */

/**
 * Normalizes a string for consistent sorting
 * - Converts to lowercase
 * - Removes accents and special characters
 * - Trims whitespace
 */
export function normalizeForSorting(text: string): string {
  if (!text) return '';
  
  return text
    .toLowerCase()
    .trim()
    // Remove accents and normalize unicode characters
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Remove special characters, keep only alphanumeric and spaces
    .replace(/[^a-z0-9\s]/g, '')
    // Replace multiple spaces with single space
    .replace(/\s+/g, ' ');
}

/**
 * Sort function for arrays of objects with text properties
 * @param items Array of objects to sort
 * @param textProperty Property name containing the text to sort by
 * @param ascending Whether to sort ascending (true) or descending (false)
 */
export function sortByNormalizedText<T>(
  items: T[],
  textProperty: keyof T,
  ascending: boolean = true
): T[] {
  return [...items].sort((a, b) => {
    const textA = normalizeForSorting(String(a[textProperty] || ''));
    const textB = normalizeForSorting(String(b[textProperty] || ''));
    
    const comparison = textA.localeCompare(textB);
    return ascending ? comparison : -comparison;
  });
}

/**
 * Sort function for arrays of strings
 * @param items Array of strings to sort
 * @param ascending Whether to sort ascending (true) or descending (false)
 */
export function sortNormalizedStrings(
  items: string[],
  ascending: boolean = true
): string[] {
  return [...items].sort((a, b) => {
    const normalizedA = normalizeForSorting(a);
    const normalizedB = normalizeForSorting(b);
    
    const comparison = normalizedA.localeCompare(normalizedB);
    return ascending ? comparison : -comparison;
  });
}

/**
 * Compare two strings using normalized sorting
 * @param a First string
 * @param b Second string
 * @returns -1 if a < b, 0 if a === b, 1 if a > b
 */
export function compareNormalizedStrings(a: string, b: string): number {
  const normalizedA = normalizeForSorting(a);
  const normalizedB = normalizeForSorting(b);
  
  return normalizedA.localeCompare(normalizedB);
}
