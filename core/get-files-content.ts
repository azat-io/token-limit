import fs from 'node:fs/promises'
import { glob } from 'tinyglobby'
import path from 'node:path'

/** Represents the content of a single file. */
interface FileContent {
  /** Absolute path to the file. */
  filePath: string

  /** Text content of the file. */
  content: string
}

/**
 * Reads and returns the content of files matching the provided glob patterns.
 *
 * This function is designed for token limit analysis, allowing you to gather
 * file contents from various sources using glob patterns. It handles multiple
 * patterns, deduplicates files, and gracefully handles read errors.
 *
 * @param {string | string[]} patterns - Glob pattern(s) to match files. Can be
 *   a single pattern string or an array of patterns. Supports standard glob
 *   syntax including:
 *
 *   - `**` for recursive directory matching
 *   - `*` for single-level wildcards
 *   - `!` prefix for exclusion patterns
 *   - Brace expansion like `{js,ts}`
 *
 * @returns {Promise<FileContent[]>} Promise resolving to an array of
 *   FileContent objects containing the file path and content for each
 *   successfully read file. Files that cannot be read (due to permissions,
 *   missing files, etc.) are logged as errors but do not cause the function to
 *   fail.
 * @throws Will not throw for individual file read errors, but may throw for
 *   glob pattern errors or other system-level issues.
 */
export async function getFilesContent(
  patterns: string[] | string,
): Promise<FileContent[]> {
  if (!patterns || (Array.isArray(patterns) && patterns.length === 0)) {
    return []
  }

  let patternArray = Array.isArray(patterns) ? patterns : [patterns]

  let validPatterns = patternArray.filter(
    pattern => typeof pattern === 'string' && pattern.trim().length > 0,
  )

  if (validPatterns.length === 0) {
    return []
  }

  let normalizedPatterns = validPatterns.map(pattern =>
    pattern.trim().replaceAll('\\', '/'),
  )

  let allFiles: string[] = []

  let patternResults = await Promise.allSettled(
    normalizedPatterns.map(async pattern => {
      try {
        return await glob(pattern, {
          caseSensitiveMatch: process.platform === 'linux',
          followSymbolicLinks: true,
          absolute: true,
          dot: true,
        })
      } catch (error) {
        console.error(`Error processing glob pattern "${pattern}":`, error)
        return []
      }
    }),
  )

  for (let result of patternResults) {
    if (result.status === 'fulfilled') {
      allFiles.push(...result.value)
    }
  }

  let uniqueFiles = [...new Set(allFiles)]

  uniqueFiles.sort()

  let fileResults = await Promise.allSettled(
    uniqueFiles.map(async filePath => {
      try {
        let normalizedPath = path.normalize(filePath)

        let stats = await fs.stat(normalizedPath)
        if (!stats.isFile()) {
          throw new Error(`Path is not a file: ${normalizedPath}`)
        }

        if (stats.size > 10 * 1024 * 1024) {
          console.warn(
            `Skipping large file (${Math.round(stats.size / 1024 / 1024)}MB): ${normalizedPath}`,
          )
          return null
        }

        let content = await fs.readFile(normalizedPath, 'utf8')
        return { filePath: normalizedPath, content }
      } catch (error) {
        console.error(`Error reading file ${filePath}:`, error)
        return null
      }
    }),
  )

  let results: FileContent[] = []
  for (let result of fileResults) {
    if (result.status === 'fulfilled' && result.value !== null) {
      results.push(result.value)
    }
  }

  return results
}
