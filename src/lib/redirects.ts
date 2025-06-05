/**
 * Redirects configuration for the website (simplified stub)
 *
 * In the standalone docs system, we don't need complex redirects,
 * so this is a minimal implementation that always returns null.
 */

/**
 * Process redirects - simplified version that returns no redirects
 * @param path - The incoming path
 * @returns null (no redirect needed)
 */
export function processRedirects(_path: string): string | null {
  // In the standalone docs system, we don't process any redirects
  return null;
}
