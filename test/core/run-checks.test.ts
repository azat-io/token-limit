import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { TokenLimitConfig } from '../../types/token-limit-config'

import { calculateCost, parseLimit } from '../../core/parse-limits'
import { getFilesContent } from '../../core/get-files-content'
import { countTokens } from '../../core/count-tokens'
import { runChecks } from '../../core/run-checks'

vi.mock(import('../../core/get-files-content'))
vi.mock(import('../../core/count-tokens'))
vi.mock(import('../../core/parse-limits'))

let mockGetFilesContent = vi.mocked(getFilesContent)
let mockCountTokens = vi.mocked(countTokens)
let mockParseLimit = vi.mocked(parseLimit)
let mockCalculateCost = vi.mocked(calculateCost)

describe('runChecks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  it('should return empty results for empty config', async () => {
    let config = [] as TokenLimitConfig
    let result = await runChecks(config)
    expect(result).toEqual({
      failed: false,
      checks: [],
    })
  })

  it('should include configPath when provided', async () => {
    let config = [] as TokenLimitConfig
    let result = await runChecks(config, '/path/to/config.ts')
    expect(result).toEqual({
      configPath: '/path/to/config.ts',
      failed: false,
      checks: [],
    })
  })

  it('should handle successful check with token limit', async () => {
    mockGetFilesContent.mockResolvedValue([
      { content: 'Hello world', filePath: 'file1.md' },
    ])
    mockCountTokens.mockReturnValue(100)
    mockParseLimit.mockReturnValue({ tokens: 200 })
    mockCalculateCost.mockReturnValue(0.05)

    let config: TokenLimitConfig = [
      {
        limit: { tokens: 200 },
        name: 'Test check',
        path: 'file1.md',
        model: 'gpt-4',
      },
    ]

    let result = await runChecks(config)

    expect(result.failed).toBeFalsy()
    expect(result.checks).toHaveLength(1)
    expect(result.checks[0]).toEqual({
      files: ['file1.md'],
      name: 'Test check',
      tokenCount: 100,
      tokenLimit: 200,
      model: 'gpt-4',
      passed: true,
      cost: 0.05,
    })
  })

  it('should handle failed check when token limit exceeded', async () => {
    mockGetFilesContent.mockResolvedValue([
      { content: 'Hello world', filePath: 'file1.md' },
    ])
    mockCountTokens.mockReturnValue(300)
    mockParseLimit.mockReturnValue({ tokens: 200 })
    mockCalculateCost.mockReturnValue(0.1)

    let config: TokenLimitConfig = [
      {
        limit: { tokens: 200 },
        name: 'Test check',
        path: 'file1.md',
        model: 'gpt-4',
      },
    ]

    let result = await runChecks(config)

    expect(result.failed).toBeTruthy()
    expect(result.checks).toHaveLength(1)
    expect(result.checks[0]).toEqual({
      files: ['file1.md'],
      name: 'Test check',
      tokenCount: 300,
      tokenLimit: 200,
      model: 'gpt-4',
      passed: false,
      cost: 0.1,
    })
  })

  it('should handle check with cost limit', async () => {
    mockGetFilesContent.mockResolvedValue([
      { content: 'Hello world', filePath: 'file1.md' },
    ])
    mockCountTokens.mockReturnValue(100)
    mockParseLimit.mockReturnValue({ cost: 0.1 })
    mockCalculateCost.mockReturnValue(0.05)

    let config: TokenLimitConfig = [
      {
        limit: { cost: 0.1 },
        name: 'Cost check',
        path: 'file1.md',
        model: 'gpt-4',
      },
    ]

    let result = await runChecks(config)

    expect(result.failed).toBeFalsy()
    expect(result.checks).toHaveLength(1)
    expect(result.checks[0]).toEqual({
      files: ['file1.md'],
      name: 'Cost check',
      costPassed: true,
      tokenCount: 100,
      model: 'gpt-4',
      costLimit: 0.1,
      cost: 0.05,
    })
  })

  it('should handle failed check when cost limit exceeded', async () => {
    mockGetFilesContent.mockResolvedValue([
      { content: 'Hello world', filePath: 'file1.md' },
    ])
    mockCountTokens.mockReturnValue(100)
    mockParseLimit.mockReturnValue({ cost: 0.03 })
    mockCalculateCost.mockReturnValue(0.05)

    let config: TokenLimitConfig = [
      {
        limit: { cost: 0.03 },
        name: 'Cost check',
        path: 'file1.md',
        model: 'gpt-4',
      },
    ]

    let result = await runChecks(config)

    expect(result.failed).toBeTruthy()
    expect(result.checks).toHaveLength(1)
    expect(result.checks[0]).toEqual({
      files: ['file1.md'],
      name: 'Cost check',
      costPassed: false,
      tokenCount: 100,
      costLimit: 0.03,
      model: 'gpt-4',
      cost: 0.05,
    })
  })

  it('should handle check with combined token and cost limits', async () => {
    mockGetFilesContent.mockResolvedValue([
      { content: 'Hello world', filePath: 'file1.md' },
    ])
    mockCountTokens.mockReturnValue(100)
    mockParseLimit.mockReturnValue({ tokens: 200, cost: 0.1 })
    mockCalculateCost.mockReturnValue(0.05)

    let config: TokenLimitConfig = [
      {
        limit: { tokens: 200, cost: 0.1 },
        name: 'Combined check',
        path: 'file1.md',
        model: 'gpt-4',
      },
    ]

    let result = await runChecks(config)

    expect(result.failed).toBeFalsy()
    expect(result.checks).toHaveLength(1)
    expect(result.checks[0]).toEqual({
      name: 'Combined check',
      files: ['file1.md'],
      costPassed: true,
      tokenCount: 100,
      tokenLimit: 200,
      model: 'gpt-4',
      costLimit: 0.1,
      passed: true,
      cost: 0.05,
    })
  })

  it('should handle check without limit (cost calculation only)', async () => {
    mockGetFilesContent.mockResolvedValue([
      { content: 'Hello world', filePath: 'file1.md' },
    ])
    mockCountTokens.mockReturnValue(100)
    mockCalculateCost.mockReturnValue(0.05)

    let config: TokenLimitConfig = [
      {
        name: 'No limit check',
        path: 'file1.md',
        model: 'gpt-4',
      },
    ]

    let result = await runChecks(config)

    expect(result.failed).toBeFalsy()
    expect(result.checks).toHaveLength(1)
    expect(result.checks[0]).toEqual({
      name: 'No limit check',
      files: ['file1.md'],
      tokenCount: 100,
      model: 'gpt-4',
      cost: 0.05,
    })
  })

  it('should handle multiple files in single check', async () => {
    mockGetFilesContent.mockResolvedValue([
      { filePath: 'file1.md', content: 'Hello' },
      { filePath: 'file2.md', content: 'world' },
    ])
    mockCountTokens.mockReturnValue(50)
    mockParseLimit.mockReturnValue({ tokens: 100 })
    mockCalculateCost.mockReturnValue(0.02)

    let config: TokenLimitConfig = [
      {
        path: ['file1.md', 'file2.md'],
        name: 'Multi-file check',
        limit: { tokens: 100 },
        model: 'gpt-4',
      },
    ]

    let result = await runChecks(config)

    expect(result.failed).toBeFalsy()
    expect(result.checks).toHaveLength(1)
    expect(result.checks[0]).toEqual({
      files: ['file1.md', 'file2.md'],
      name: 'Multi-file check',
      tokenLimit: 100,
      model: 'gpt-4',
      tokenCount: 50,
      passed: true,
      cost: 0.02,
    })

    expect(mockCountTokens).toHaveBeenCalledWith('Hello\nworld', 'gpt-4')
  })

  it('should handle no files found (missed check)', async () => {
    mockGetFilesContent.mockResolvedValue([])

    let config: TokenLimitConfig = [
      {
        name: 'Missing files check',
        path: 'nonexistent.md',
        limit: { tokens: 100 },
        model: 'gpt-4',
      },
    ]

    let result = await runChecks(config)

    expect(result.failed).toBeTruthy()
    expect(result.checks).toHaveLength(1)
    expect(result.checks[0]).toEqual({
      name: 'Missing files check',
      files: ['nonexistent.md'],
      model: 'gpt-4',
      tokenCount: 0,
      missed: true,
      cost: 0,
    })
  })

  it('should handle error during file processing', async () => {
    mockGetFilesContent.mockRejectedValue(new Error('File read error'))

    let config: TokenLimitConfig = [
      {
        limit: { tokens: 100 },
        name: 'Error check',
        path: 'file1.md',
        model: 'gpt-4',
      },
    ]

    let result = await runChecks(config)

    expect(result.failed).toBeTruthy()
    expect(result.checks).toHaveLength(1)
    expect(result.checks[0]).toEqual({
      message: 'File read error',
      name: 'Error check',
      files: ['file1.md'],
      model: 'gpt-4',
      tokenCount: 0,
      missed: true,
      cost: 0,
    })
  })

  it('should use default values when not specified', async () => {
    mockGetFilesContent.mockResolvedValue([
      { content: 'Hello world', filePath: 'file1.md' },
    ])
    mockCountTokens.mockReturnValue(100)
    mockCalculateCost.mockReturnValue(0.05)

    let config: TokenLimitConfig = [
      {
        path: 'file1.md',
      },
    ]

    let result = await runChecks(config)

    expect(result.failed).toBeFalsy()
    expect(result.checks).toHaveLength(1)
    expect(result.checks[0]).toEqual({
      files: ['file1.md'],
      name: 'file1.md',
      tokenCount: 100,
      model: 'gpt-4',
      cost: 0.05,
    })

    expect(mockCountTokens).toHaveBeenCalledWith('Hello world', 'gpt-4')
  })

  it('should handle multiple checks with mixed results', async () => {
    mockGetFilesContent
      .mockResolvedValueOnce([
        { content: 'Short content', filePath: 'file1.md' },
      ])
      .mockResolvedValueOnce([
        { content: 'Very long content', filePath: 'file2.md' },
      ])

    mockCountTokens.mockReturnValueOnce(50).mockReturnValueOnce(300)

    mockParseLimit
      .mockReturnValueOnce({ tokens: 100 })
      .mockReturnValueOnce({ tokens: 200 })

    mockCalculateCost.mockReturnValueOnce(0.02).mockReturnValueOnce(0.1)

    let config: TokenLimitConfig = [
      {
        limit: { tokens: 100 },
        name: 'Success check',
        path: 'file1.md',
        model: 'gpt-4',
      },
      {
        limit: { tokens: 200 },
        name: 'Failed check',
        path: 'file2.md',
        model: 'gpt-4',
      },
    ]

    let result = await runChecks(config)

    expect(result.failed).toBeTruthy()
    expect(result.checks).toHaveLength(2)

    expect(result.checks[0]).toEqual({
      name: 'Success check',
      files: ['file1.md'],
      tokenLimit: 100,
      model: 'gpt-4',
      tokenCount: 50,
      passed: true,
      cost: 0.02,
    })

    expect(result.checks[1]).toEqual({
      name: 'Failed check',
      files: ['file2.md'],
      tokenCount: 300,
      tokenLimit: 200,
      model: 'gpt-4',
      passed: false,
      cost: 0.1,
    })
  })

  it('should handle different models', async () => {
    mockGetFilesContent.mockResolvedValue([
      { content: 'Hello world', filePath: 'file1.md' },
    ])
    mockCountTokens.mockReturnValue(75)
    mockCalculateCost.mockReturnValue(0.03)

    let config: TokenLimitConfig = [
      {
        model: 'claude-3.5-sonnet',
        name: 'Claude check',
        path: 'file1.md',
      },
    ]

    let result = await runChecks(config)

    expect(result.failed).toBeFalsy()
    expect(result.checks).toHaveLength(1)
    expect(result.checks[0]).toEqual({
      model: 'claude-3.5-sonnet',
      name: 'Claude check',
      files: ['file1.md'],
      tokenCount: 75,
      cost: 0.03,
    })

    expect(mockCountTokens).toHaveBeenCalledWith(
      'Hello world',
      'claude-3.5-sonnet',
    )
  })

  it('should use fallback name "Unknown" for missed checks when name is not provided', async () => {
    mockGetFilesContent.mockResolvedValue([])

    let config: TokenLimitConfig = [
      {
        path: 'nonexistent.md',
        limit: { tokens: 100 },
      },
    ]

    let result = await runChecks(config)

    expect(result.failed).toBeTruthy()
    expect(result.checks).toHaveLength(1)
    expect(result.checks[0]).toEqual({
      files: ['nonexistent.md'],
      name: 'Unknown',
      model: 'gpt-4',
      tokenCount: 0,
      missed: true,
      cost: 0,
    })
  })

  it('should use fallback name "Unknown" for error cases when name is not provided', async () => {
    mockGetFilesContent.mockRejectedValue(new Error('File read error'))

    let config: TokenLimitConfig = [
      {
        limit: { tokens: 100 },
        path: 'file1.md',
      },
    ]

    let result = await runChecks(config)

    expect(result.failed).toBeTruthy()
    expect(result.checks).toHaveLength(1)
    expect(result.checks[0]).toEqual({
      message: 'File read error',
      files: ['file1.md'],
      name: 'Unknown',
      model: 'gpt-4',
      tokenCount: 0,
      missed: true,
      cost: 0,
    })
  })

  it('should use files.join as fallback name for successful checks when name is not provided', async () => {
    mockGetFilesContent.mockResolvedValue([
      { content: 'Hello world', filePath: 'file1.md' },
      { content: 'Another file', filePath: 'file2.md' },
    ])
    mockCountTokens.mockReturnValue(100)
    mockCalculateCost.mockReturnValue(0.05)

    let config: TokenLimitConfig = [
      {
        path: ['file1.md', 'file2.md'],
      },
    ]

    let result = await runChecks(config)

    expect(result.failed).toBeFalsy()
    expect(result.checks).toHaveLength(1)
    expect(result.checks[0]).toEqual({
      files: ['file1.md', 'file2.md'],
      name: 'file1.md, file2.md',
      tokenCount: 100,
      model: 'gpt-4',
      cost: 0.05,
    })

    expect(mockCountTokens).toHaveBeenCalledWith(
      'Hello world\nAnother file',
      'gpt-4',
    )
  })

  it('should handle promise rejection in Promise.allSettled', async () => {
    vi.spyOn(Promise, 'allSettled').mockResolvedValue([
      {
        value: {
          name: 'Success check',
          files: ['file1.md'],
          tokenCount: 100,
          model: 'gpt-4',
          cost: 0.05,
        },
        status: 'fulfilled',
      },
      {
        reason: new Error('Promise rejected unexpectedly'),
        status: 'rejected',
      },
    ])

    let config: TokenLimitConfig = [
      {
        name: 'Test check',
        path: 'file1.md',
        model: 'gpt-4',
      },
    ]

    let result = await runChecks(config)

    expect(result.failed).toBeTruthy()
    expect(result.checks).toHaveLength(2)

    expect(result.checks[0]).toEqual({
      name: 'Success check',
      files: ['file1.md'],
      tokenCount: 100,
      model: 'gpt-4',
      cost: 0.05,
    })

    expect(result.checks[1]).toEqual({
      message: 'Promise rejected unexpectedly',
      name: 'Unknown',
      model: 'gpt-4',
      tokenCount: 0,
      missed: true,
      files: [],
      cost: 0,
    })
  })

  it('should handle no files found with array path (missed check with array)', async () => {
    mockGetFilesContent.mockResolvedValue([])

    let config: TokenLimitConfig = [
      {
        path: ['nonexistent1.md', 'nonexistent2.md'],
        name: 'Missing files check with array',
        limit: { tokens: 100 },
        model: 'gpt-4',
      },
    ]

    let result = await runChecks(config)

    expect(result.failed).toBeTruthy()
    expect(result.checks).toHaveLength(1)
    expect(result.checks[0]).toEqual({
      files: ['nonexistent1.md', 'nonexistent2.md'],
      name: 'Missing files check with array',
      model: 'gpt-4',
      tokenCount: 0,
      missed: true,
      cost: 0,
    })
  })

  it('should handle error during file processing with array path', async () => {
    mockGetFilesContent.mockRejectedValue(new Error('File read error'))

    let config: TokenLimitConfig = [
      {
        name: 'Error check with array',
        path: ['file1.md', 'file2.md'],
        limit: { tokens: 100 },
        model: 'gpt-4',
      },
    ]

    let result = await runChecks(config)

    expect(result.failed).toBeTruthy()
    expect(result.checks).toHaveLength(1)
    expect(result.checks[0]).toEqual({
      files: ['file1.md', 'file2.md'],
      name: 'Error check with array',
      message: 'File read error',
      model: 'gpt-4',
      tokenCount: 0,
      missed: true,
      cost: 0,
    })
  })

  it('should handle non-Error exception during file processing', async () => {
    mockGetFilesContent.mockRejectedValue(
      'String error instead of Error object',
    )

    let config: TokenLimitConfig = [
      {
        name: 'Non-Error check',
        limit: { tokens: 100 },
        path: 'file1.md',
        model: 'gpt-4',
      },
    ]

    let result = await runChecks(config)

    expect(result.failed).toBeTruthy()
    expect(result.checks).toHaveLength(1)
    expect(result.checks[0]).toEqual({
      message: 'Unknown error',
      name: 'Non-Error check',
      files: ['file1.md'],
      model: 'gpt-4',
      tokenCount: 0,
      missed: true,
      cost: 0,
    })
  })
})
