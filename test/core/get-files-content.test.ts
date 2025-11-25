import type { Stats } from 'node:fs'

import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import fs from 'node:fs/promises'
import { glob } from 'tinyglobby'

import { getFilesContent } from '../../core/get-files-content'

vi.mock(import('tinyglobby'), () => ({
  glob: vi.fn(),
}))

let mockedGlob = vi.mocked(glob)

describe('getFilesContent', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mockedGlob.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should return empty array for non-matching glob pattern', async () => {
    expect.assertions(1)
    mockedGlob.mockResolvedValue([])
    let result = await getFilesContent('non-existing-file.md')
    expect(result).toEqual([])
  })

  it('should return content for existing file', async () => {
    expect.assertions(3)
    mockedGlob.mockResolvedValue(['test/fixtures/existing-file.md'])
    vi.spyOn(fs, 'stat').mockResolvedValue({
      isFile: () => true,
      size: 1000,
    } as Stats)
    vi.spyOn(fs, 'readFile').mockResolvedValue('test content')

    let result = await getFilesContent('test/fixtures/existing-file.md')
    expect(result).toHaveLength(1)
    expect(result[0]?.filePath).toContain('existing-file.md')
    expect(result[0]?.content).toBeDefined()
  })

  it('should handle multiple glob patterns', async () => {
    expect.assertions(1)
    mockedGlob.mockResolvedValue([
      'test/fixtures/existing-file.md',
      'test/fixtures/another-file.md',
    ])
    vi.spyOn(fs, 'stat').mockResolvedValue({
      isFile: () => true,
      size: 1000,
    } as Stats)
    vi.spyOn(fs, 'readFile').mockResolvedValue('test content')

    let result = await getFilesContent(['test/fixtures/*.md'])
    expect(result).toHaveLength(2)
  })

  it('should deduplicate files from multiple patterns', async () => {
    expect.assertions(1)
    mockedGlob
      .mockResolvedValueOnce(['test/fixtures/existing-file.md'])
      .mockResolvedValueOnce([
        'test/fixtures/existing-file.md',
        'test/fixtures/another-file.md',
      ])
    vi.spyOn(fs, 'stat').mockResolvedValue({
      isFile: () => true,
      size: 1000,
    } as Stats)
    vi.spyOn(fs, 'readFile').mockResolvedValue('test content')

    let result = await getFilesContent([
      'test/fixtures/existing-file.md',
      'test/fixtures/*.md',
    ])
    expect(result).toHaveLength(2)
  })

  it('should handle readFile errors', async () => {
    expect.assertions(2)

    mockedGlob.mockResolvedValue(['test/fixtures/existing-file.md'])
    vi.spyOn(fs, 'stat').mockResolvedValue({
      isFile: () => true,
      size: 1000,
    } as Stats)
    vi.spyOn(fs, 'readFile').mockRejectedValue(new Error('Permission denied'))

    let result = await getFilesContent('test/fixtures/existing-file.md')

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('Error reading file'),
      expect.any(Error),
    )
    expect(result).toEqual([])
  })

  it('should return empty array for null patterns', async () => {
    expect.assertions(1)
    let result = await getFilesContent(null as unknown as string)
    expect(result).toEqual([])
  })

  it('should return empty array for undefined patterns', async () => {
    expect.assertions(1)
    let result = await getFilesContent(undefined as unknown as string)
    expect(result).toEqual([])
  })

  it('should return empty array for empty array patterns', async () => {
    expect.assertions(1)
    let result = await getFilesContent([])
    expect(result).toEqual([])
  })

  it('should return empty array for array with empty strings', async () => {
    expect.assertions(1)
    let result = await getFilesContent(['', '   ', ''])
    expect(result).toEqual([])
  })

  it('should handle glob pattern errors', async () => {
    expect.assertions(2)

    mockedGlob.mockRejectedValue(new Error('Glob error'))

    let result = await getFilesContent('test/fixtures/*.md')

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('Error processing glob pattern'),
      expect.any(Error),
    )
    expect(result).toEqual([])
  })

  it('should ignore rejected glob results from Promise.allSettled', async () => {
    expect.assertions(2)

    mockedGlob.mockResolvedValue([])
    let allSettledSpy = vi.spyOn(Promise, 'allSettled')
    allSettledSpy
      .mockResolvedValueOnce([
        { reason: new Error('Glob failed'), status: 'rejected' },
      ] as PromiseSettledResult<string[]>[])
      .mockResolvedValueOnce([] as PromiseSettledResult<null>[])

    try {
      let result = await getFilesContent('test/fixtures/*.md')

      expect(result).toEqual([])
      expect(allSettledSpy).toHaveBeenCalledTimes(2)
    } finally {
      allSettledSpy.mockRestore()
    }
  })

  it('should handle non-file paths (directories)', async () => {
    expect.assertions(2)

    mockedGlob.mockResolvedValue(['test/fixtures/existing-file.md'])
    vi.spyOn(fs, 'stat').mockResolvedValue({
      isFile: () => false,
      size: 1000,
    } as Stats)

    let result = await getFilesContent('test/fixtures/existing-file.md')

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('Error reading file'),
      expect.any(Error),
    )
    expect(result).toEqual([])
  })

  it('should skip large files (>10MB)', async () => {
    expect.assertions(2)

    let consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    mockedGlob.mockResolvedValue(['test/fixtures/existing-file.md'])
    vi.spyOn(fs, 'stat').mockResolvedValue({
      size: 11 * 1024 * 1024,
      isFile: () => true,
    } as Stats)

    let result = await getFilesContent('test/fixtures/existing-file.md')

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Skipping large file'),
    )
    expect(result).toEqual([])

    consoleWarnSpy.mockRestore()
  })
})
