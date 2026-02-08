import { describe, expect, it } from 'vitest'

import type {
  TokenLimitConfig,
  TokenCheck,
} from '../../types/token-limit-config'
import type { SupportedModelNames } from '../../types/supported-model-names'

import { validateConfig } from '../../config/validate-config'

describe('validateConfig', () => {
  it('should return valid for a proper configuration', () => {
    expect.assertions(2)

    let config: TokenLimitConfig = [
      {
        model: 'claude-3.5-sonnet',
        name: 'documentation',
        path: 'CLAUDE.md',
        limit: '200k',
      },
    ]

    let result = validateConfig(config)

    expect(result.isValid).toBeTruthy()
    expect(result.errors).toHaveLength(0)
  })

  it('should return error when config is not an array', () => {
    expect.assertions(3)

    let config = { path: 'test.md' } as unknown as TokenLimitConfig

    let result = validateConfig(config)

    expect(result.isValid).toBeFalsy()
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toEqual({
      message: 'Configuration must be an array of check objects',
      path: 'root',
    })
  })

  it('should warn when config is empty', () => {
    expect.assertions(3)

    let config: TokenLimitConfig = []

    let result = validateConfig(config)

    expect(result.isValid).toBeFalsy()
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toEqual({
      message: 'Configuration is empty - no checks will be performed',
      path: 'root',
    })
  })

  it('should detect duplicate check names', () => {
    expect.assertions(3)

    let config: TokenLimitConfig = [
      { path: 'file1.md', name: 'docs' },
      { path: 'file2.md', name: 'docs' },
      { path: 'file3.md', name: 'other' },
    ]

    let result = validateConfig(config)

    expect(result.isValid).toBeFalsy()
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toEqual({
      message: 'Duplicate check names found: docs',
      path: 'checks',
    })
  })

  it('should require path field', () => {
    expect.assertions(2)

    let config: TokenLimitConfig = [{ limit: '100k' } as unknown as TokenCheck]

    let result = validateConfig(config)

    expect(result.isValid).toBeFalsy()
    expect(result.errors).toContainEqual({
      message: 'Path is required for each check',
      path: 'checks[0].path',
    })
  })

  it('should reject empty string path', () => {
    expect.assertions(2)

    let config: TokenLimitConfig = [{ path: '' }]

    let result = validateConfig(config)

    expect(result.isValid).toBeFalsy()
    expect(result.errors).toContainEqual({
      message: 'Path cannot be empty',
      path: 'checks[0].path',
    })
  })

  it('should reject empty array path', () => {
    expect.assertions(2)

    let config: TokenLimitConfig = [{ path: [] }]

    let result = validateConfig(config)

    expect(result.isValid).toBeFalsy()
    expect(result.errors).toContainEqual({
      message: 'Path array cannot be empty',
      path: 'checks[0].path',
    })
  })

  it('should reject non-string elements in path array', () => {
    expect.assertions(2)

    let config: TokenLimitConfig = [
      { path: ['valid.md', 123, 'another.md'] } as unknown as TokenCheck,
    ]

    let result = validateConfig(config)

    expect(result.isValid).toBeFalsy()
    expect(result.errors).toContainEqual({
      message: 'All path elements must be strings',
      path: 'checks[0].path[1]',
    })
  })

  it('should reject empty string elements in path array', () => {
    expect.assertions(2)

    let config: TokenLimitConfig = [{ path: ['valid.md', '', 'another.md'] }]

    let result = validateConfig(config)

    expect(result.isValid).toBeFalsy()
    expect(result.errors).toContainEqual({
      message: 'Path element cannot be empty',
      path: 'checks[0].path[1]',
    })
  })

  it('should reject invalid path types', () => {
    expect.assertions(2)

    let config: TokenLimitConfig = [{ path: 123 } as unknown as TokenCheck]

    let result = validateConfig(config)

    expect(result.isValid).toBeFalsy()
    expect(result.errors).toContainEqual({
      message: 'Path must be a string or array of strings',
      path: 'checks[0].path',
    })
  })

  it('should accept valid numeric limits', () => {
    expect.assertions(1)

    let config: TokenLimitConfig = [{ path: 'test.md', limit: 1000 }]

    let result = validateConfig(config)

    expect(result.isValid).toBeTruthy()
  })

  it('should accept string limits with k/K suffix', () => {
    expect.assertions(3)

    let configs: TokenLimitConfig[] = [
      [{ path: 'test.md', limit: '100k' }],
      [{ path: 'test.md', limit: '200K' }],
      [{ path: 'test.md', limit: '50' }],
    ]

    for (let config of configs) {
      let result = validateConfig(config)
      expect(result.isValid).toBeTruthy()
    }
  })

  it('should accept known model names as limits', () => {
    expect.assertions(1)

    let config: TokenLimitConfig = [
      { limit: 'claude-3.5-sonnet', path: 'test.md' },
    ]

    let result = validateConfig(config)

    expect(result.isValid).toBeTruthy()
  })

  it('should reject negative numeric limits', () => {
    expect.assertions(2)

    let config: TokenLimitConfig = [{ path: 'test.md', limit: -100 }]

    let result = validateConfig(config)

    expect(result.isValid).toBeFalsy()
    expect(result.errors).toContainEqual({
      message: 'Numeric limit must be positive',
      path: 'checks[0].limit',
    })
  })

  it('should reject zero limit', () => {
    expect.assertions(2)

    let config: TokenLimitConfig = [{ path: 'test.md', limit: 0 }]

    let result = validateConfig(config)

    expect(result.isValid).toBeFalsy()
    expect(result.errors).toContainEqual({
      message: 'Numeric limit must be positive',
      path: 'checks[0].limit',
    })
  })

  it('should reject invalid string limit formats', () => {
    expect.assertions(4)

    let config: TokenLimitConfig = [
      { limit: 'invalid-format', path: 'test.md' },
    ]

    let result = validateConfig(config)

    expect(result.isValid).toBeFalsy()
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]?.path).toBe('checks[0].limit')
    expect(result.errors[0]?.message).toContain('Invalid limit format')
  })

  it('should reject invalid limit types', () => {
    expect.assertions(2)

    let config: TokenLimitConfig = [
      { path: 'test.md', limit: true } as unknown as TokenCheck,
    ]

    let result = validateConfig(config)

    expect(result.isValid).toBeFalsy()
    expect(result.errors).toContainEqual({
      message: 'Limit must be a string or number',
      path: 'checks[0].limit',
    })
  })

  it('should accept known models', () => {
    expect.assertions(4)

    let knownModels = [
      'gpt-4',
      'gpt-4-turbo',
      'gpt-3.5-turbo',
      'claude-3.5-sonnet',
    ] as SupportedModelNames[]

    for (let model of knownModels) {
      let config: TokenLimitConfig = [{ path: 'test.md', model }]

      let result = validateConfig(config)
      expect(result.isValid).toBeTruthy()
    }
  })

  it('should reject unknown models', () => {
    expect.assertions(3)

    let config: TokenLimitConfig = [
      { model: 'unknown-model' as SupportedModelNames, path: 'test.md' },
    ]

    let result = validateConfig(config)

    expect(result.isValid).toBeFalsy()
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]?.message).toContain('Unknown model "unknown-model"')
  })

  it('should collect multiple errors from different fields', () => {
    expect.assertions(2)

    let config: TokenLimitConfig = [
      {
        limit: 'invalid-limit',
        model: 'unknown-model',
        path: '',
      } as unknown as TokenCheck,
    ]

    let result = validateConfig(config)

    expect(result.isValid).toBeFalsy()
    expect(result.errors.length).toBeGreaterThan(2)
  })

  it('should validate multiple checks in configuration', () => {
    expect.assertions(2)

    let config: TokenLimitConfig = [
      { path: 'valid1.md', limit: '100k' },
      { limit: -100, path: '' },
      { model: 'claude-3.5-sonnet', path: 'valid2.md' },
    ]

    let result = validateConfig(config)

    expect(result.isValid).toBeFalsy()
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'checks[1].path' }),
        expect.objectContaining({ path: 'checks[1].limit' }),
      ]),
    )
  })

  it('should handle edge case with boundary values', () => {
    expect.assertions(1)

    let config: TokenLimitConfig = [
      {
        path: 'test.md',
        limit: 1,
      },
    ]

    let result = validateConfig(config)

    expect(result.isValid).toBeTruthy()
  })
})
