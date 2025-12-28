import type { lilconfig as LilconfigFunction, AsyncSearcher } from 'lilconfig'

import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { relative, resolve, join } from 'node:path'

import type { TokenLimitConfig } from '../../types/token-limit-config'

import { loadConfig } from '../../config/load-config'

type LilconfigFactory = typeof LilconfigFunction

let { mockLilconfig, mockExplorer } = vi.hoisted(() => {
  let explorer = {
    search: vi.fn<AsyncSearcher['search']>(),
    load: vi.fn<AsyncSearcher['load']>(),
    clearSearchCache: vi.fn(),
    clearLoadCache: vi.fn(),
    clearCaches: vi.fn(),
  } satisfies AsyncSearcher

  let lilconfigMock = vi.fn<LilconfigFactory>(() => explorer)

  return { mockLilconfig: lilconfigMock, mockExplorer: explorer }
})

vi.mock(import('lilconfig'), () => ({
  lilconfig: mockLilconfig,
}))

let originalCwd = process.cwd
let mockCwd = '/test/project'

describe('loadConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(process, 'cwd').mockImplementation(() => mockCwd)
  })

  afterEach(() => {
    process.cwd = originalCwd
  })

  it('should find and process configuration', async () => {
    expect.assertions(3)

    let mockConfig: TokenLimitConfig = [
      {
        path: 'src/**/*.ts',
        model: 'gpt-4',
        limit: '10k',
      },
    ]

    mockExplorer.search.mockResolvedValue({
      filepath: '/test/project/.token-limit.json',
      config: mockConfig,
    })

    let result = await loadConfig()

    expect(mockExplorer.search).toHaveBeenCalledWith(mockCwd)
    expect(result).toEqual({
      config: [
        {
          path: join('/test/project', 'src/**/*.ts'),
          name: 'src/**/*.ts',
          model: 'gpt-4',
          limit: '10k',
        },
      ],
      configDirectory: '/test/project',
      configPath: '.token-limit.json',
    })
    expect(result.config).toHaveLength(1)
  })

  it('should search from specified directory', async () => {
    expect.assertions(3)

    let searchFrom = '/custom/path'
    let mockConfig: TokenLimitConfig = [
      {
        path: 'docs/*.md',
        limit: 5000,
      },
    ]

    mockExplorer.search.mockResolvedValue({
      filepath: '/custom/path/token-limit.config.js',
      config: mockConfig,
    })

    let result = await loadConfig(undefined, searchFrom)

    expect(mockExplorer.search).toHaveBeenCalledWith(searchFrom)
    expect(result.configPath).toBe('token-limit.config.js')
    expect(result.configDirectory).toBe('/custom/path')
  })

  it('should throw error when configuration is not found', async () => {
    expect.assertions(1)

    mockExplorer.search.mockResolvedValue(null)

    await expect(loadConfig()).rejects.toThrowError(
      'Token limit configuration not found',
    )
  })

  it('should load configuration by absolute path', async () => {
    expect.assertions(2)

    let configPath = '/absolute/path/config.ts'
    let mockConfig: TokenLimitConfig = [
      {
        path: 'lib/**/*.js',
        limit: '20k',
      },
    ]

    mockExplorer.load.mockResolvedValue({
      filepath: configPath,
      config: mockConfig,
    })

    let result = await loadConfig(configPath)

    expect(mockExplorer.load).toHaveBeenCalledWith(configPath)
    expect(result.configDirectory).toBe('/absolute/path')
  })

  it('should load configuration by relative path', async () => {
    expect.assertions(2)

    let configPath = './my-config.json'
    let absolutePath = resolve(mockCwd, configPath)
    let mockConfig: TokenLimitConfig = [
      {
        path: 'test/**/*.spec.ts',
        limit: 15000,
      },
    ]

    mockExplorer.load.mockResolvedValue({
      filepath: absolutePath,
      config: mockConfig,
    })

    let result = await loadConfig(configPath)

    expect(mockExplorer.load).toHaveBeenCalledWith(absolutePath)
    expect(result.configPath).toBe(relative(mockCwd, absolutePath))
  })

  it('should handle path with spaces', async () => {
    expect.assertions(1)

    let configPath = '  ./spaced-config.js  '
    let trimmedPath = './spaced-config.js'
    let absolutePath = resolve(mockCwd, trimmedPath)
    let mockConfig: TokenLimitConfig = []

    mockExplorer.load.mockResolvedValue({
      filepath: absolutePath,
      config: mockConfig,
    })

    await loadConfig(configPath)

    expect(mockExplorer.load).toHaveBeenCalledWith(absolutePath)
  })

  it('should ignore empty path and use search instead', async () => {
    expect.assertions(2)

    let mockConfig: TokenLimitConfig = []

    mockExplorer.search.mockResolvedValue({
      filepath: '/test/project/.token-limit',
      config: mockConfig,
    })

    await loadConfig('   ')

    expect(mockExplorer.search).toHaveBeenCalledWith(mockCwd)
    expect(mockExplorer.load).not.toHaveBeenCalled()
  })

  it('should process string path', async () => {
    expect.assertions(1)

    let mockConfig: TokenLimitConfig = [
      {
        path: 'relative/path.ts',
        limit: '5k',
      },
    ]

    mockExplorer.search.mockResolvedValue({
      filepath: '/test/project/.token-limit.json',
      config: mockConfig,
    })

    let result = await loadConfig()

    expect(result.config[0]?.path).toBe('/test/project/relative/path.ts')
  })

  it('should preserve absolute path', async () => {
    expect.assertions(1)

    let mockConfig: TokenLimitConfig = [
      {
        path: '/absolute/path.ts',
        limit: '5k',
      },
    ]

    mockExplorer.search.mockResolvedValue({
      filepath: '/test/project/.token-limit.json',
      config: mockConfig,
    })

    let result = await loadConfig()

    expect(result.config[0]?.path).toBe('/absolute/path.ts')
  })

  it('should process array of paths', async () => {
    expect.assertions(1)

    let mockConfig: TokenLimitConfig = [
      {
        path: ['src/**/*.ts', '/absolute/file.js', 'docs/*.md'],
        limit: '10k',
      },
    ]

    mockExplorer.search.mockResolvedValue({
      filepath: '/test/project/.token-limit.json',
      config: mockConfig,
    })

    let result = await loadConfig()

    expect(result.config[0]?.path).toEqual([
      '/test/project/src/**/*.ts',
      '/absolute/file.js',
      '/test/project/docs/*.md',
    ])
  })

  it('should generate name for string path', async () => {
    expect.assertions(1)

    let mockConfig: TokenLimitConfig = [
      {
        path: 'src/index.ts',
        limit: '5k',
      },
    ]

    mockExplorer.search.mockResolvedValue({
      filepath: '/test/project/.token-limit.json',
      config: mockConfig,
    })

    let result = await loadConfig()

    expect(result.config[0]?.name).toBe('src/index.ts')
  })

  it('should generate name for array of paths', async () => {
    expect.assertions(1)

    let mockConfig: TokenLimitConfig = [
      {
        path: ['src/**/*.ts', 'docs/*.md'],
        limit: '10k',
      },
    ]

    mockExplorer.search.mockResolvedValue({
      filepath: '/test/project/.token-limit.json',
      config: mockConfig,
    })

    let result = await loadConfig()

    expect(result.config[0]?.name).toBe('src/**/*.ts, docs/*.md')
  })

  it('should preserve existing name', async () => {
    expect.assertions(1)

    let mockConfig: TokenLimitConfig = [
      {
        path: 'src/**/*.ts',
        name: 'Custom Name',
        limit: '10k',
      },
    ]

    mockExplorer.search.mockResolvedValue({
      filepath: '/test/project/.token-limit.json',
      config: mockConfig,
    })

    let result = await loadConfig()

    expect(result.config[0]?.name).toBe('Custom Name')
  })

  it('should skip processing when path is not a string or array', async () => {
    expect.assertions(1)

    // Intentionally omit path to ensure loadConfig handles malformed entries.
    let mockConfig = [
      {
        name: 'Broken entry',
        limit: '10k',
      },
    ] as unknown as TokenLimitConfig

    mockExplorer.search.mockResolvedValue({
      filepath: '/test/project/.token-limit.json',
      config: mockConfig,
    })

    let result = await loadConfig()

    expect(result.config[0]?.path).toBeUndefined()
  })

  it('should preserve all TokenCheck fields', async () => {
    expect.assertions(3)

    let mockConfig: TokenLimitConfig = [
      {
        model: 'claude-3.5-sonnet',
        path: 'src/**/*.ts',
        limit: '10k',
      },
    ]

    mockExplorer.search.mockResolvedValue({
      filepath: '/test/project/.token-limit.json',
      config: mockConfig,
    })

    let result = await loadConfig()

    let [processedConfig] = result.config
    expect(processedConfig?.limit).toBe('10k')
    expect(processedConfig?.model).toBe('claude-3.5-sonnet')
    expect(processedConfig?.path).toBe('/test/project/src/**/*.ts')
  })

  it('should process multiple TokenCheck objects', async () => {
    expect.assertions(4)

    let mockConfig: TokenLimitConfig = [
      {
        name: 'TypeScript files',
        path: 'src/**/*.ts',
        limit: '10k',
      },
      {
        path: 'docs/*.md',
        limit: '5k',
      },
      {
        path: ['README.md', 'CHANGELOG.md'],
        limit: 2000,
      },
    ]

    mockExplorer.search.mockResolvedValue({
      filepath: '/test/project/.token-limit.json',
      config: mockConfig,
    })

    let result = await loadConfig()

    expect(result.config).toHaveLength(3)
    expect(result.config[0]?.name).toBe('TypeScript files')
    expect(result.config[1]?.name).toBe('docs/*.md')
    expect(result.config[2]?.name).toBe('README.md, CHANGELOG.md')
  })

  it('should handle empty configuration', async () => {
    expect.assertions(3)

    let mockConfig: TokenLimitConfig = []

    mockExplorer.search.mockResolvedValue({
      filepath: '/test/project/.token-limit.json',
      config: mockConfig,
    })

    let result = await loadConfig()

    expect(result.config).toEqual([])
    expect(result.configDirectory).toBe('/test/project')
    expect(result.configPath).toBe('.token-limit.json')
  })

  it('should handle configuration without includeContext', async () => {
    expect.assertions(1)

    let mockConfig: TokenLimitConfig = [
      {
        path: 'src/**/*.ts',
        limit: '10k',
      },
    ]

    mockExplorer.search.mockResolvedValue({
      filepath: '/test/project/.token-limit.json',
      config: mockConfig,
    })

    let result = await loadConfig()

    expect(result.config[0]).not.toHaveProperty('includeContext')
  })

  it('should throw error when loading non-existent file', async () => {
    expect.assertions(1)

    mockExplorer.load.mockResolvedValue(null)

    await expect(loadConfig('/nonexistent/config.js')).rejects.toThrowError(
      'Token limit configuration not found',
    )
  })
})
