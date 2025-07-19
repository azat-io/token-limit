import { describe, expect, it } from 'vitest'

import { normalizeFilePaths } from '../../core/normalize-file-paths'

describe('normalizeFilePaths', () => {
  it('should convert backslashes to forward slashes', () => {
    let input = [
      String.raw`C:\path\to\file.txt`,
      String.raw`D:\another\path\file.txt`,
    ]
    let expected = ['C:/path/to/file.txt', 'D:/another/path/file.txt']
    expect(normalizeFilePaths(input)).toEqual(expected)
  })

  it('should handle mixed slashes', () => {
    let input = [
      String.raw`C:/path\to/file.txt`,
      String.raw`D:\another/path/file.txt`,
    ]
    let expected = ['C:/path/to/file.txt', 'D:/another/path/file.txt']
    expect(normalizeFilePaths(input)).toEqual(expected)
  })

  it('should return an empty array for empty input', () => {
    expect(normalizeFilePaths([])).toEqual([])
  })

  it('should handle single path with backslashes', () => {
    let input = [String.raw`C:\single\file.txt`]
    let expected = ['C:/single/file.txt']
    expect(normalizeFilePaths(input)).toEqual(expected)
  })
})
