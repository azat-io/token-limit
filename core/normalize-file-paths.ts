/**
 * Normalizes file paths for cross-platform compatibility. Converts Windows
 * backslashes to forward slashes for glob patterns.
 *
 * @param {string[]} paths - Array of file paths to normalize
 * @returns {string[]} Normalized paths with forward slashes
 */
export function normalizeFilePaths(paths: string[]): string[] {
  return paths.map(path => path.replaceAll('\\', '/'))
}
