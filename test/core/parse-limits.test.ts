import { describe, expect, it } from 'vitest'

import type { TokenLimit, CostLimit } from '../../types/token-limit-config'

import {
  calculateCost,
  formatTokens,
  parseLimit,
  formatCost,
} from '../../core/parse-limits'

describe('parseLimit', () => {
  describe('string and number inputs', () => {
    it('should parse numeric token limits', () => {
      expect.assertions(2)

      expect(parseLimit(1000, '')).toEqual({ tokens: 1000 })
      expect(parseLimit('1000', '')).toEqual({ tokens: 1000 })
    })

    it('should throw error for invalid numeric token limits', () => {
      expect.assertions(4)

      expect(() => parseLimit(-1, '')).toThrow(
        'Invalid token limit: -1. Must be a positive finite number.',
      )
      expect(() => parseLimit(Number.NEGATIVE_INFINITY, '')).toThrow(
        'Invalid token limit: -Infinity. Must be a positive finite number.',
      )
      expect(() => parseLimit(Number.POSITIVE_INFINITY, '')).toThrow(
        'Invalid token limit: Infinity. Must be a positive finite number.',
      )
      expect(() => parseLimit(Number.NaN, '')).toThrow(
        'Invalid token limit: NaN. Must be a positive finite number.',
      )
    })

    it('should throw error for invalid token limit values in strings', () => {
      expect.assertions(3)

      expect(() => parseLimit('-1k', '')).toThrow(
        'Invalid token limit format: "-1k"',
      )
      expect(() => parseLimit('NaNk', '')).toThrow(
        'Invalid token limit format: "NaNk"',
      )
      expect(() => parseLimit('Infinityk', '')).toThrow(
        'Invalid token limit format: "Infinityk"',
      )
    })

    it('should parse token limits with suffixes', () => {
      expect.assertions(8)

      expect(parseLimit('1k', '')).toEqual({ tokens: 1000 })
      expect(parseLimit('1.5k', '')).toEqual({ tokens: 1500 })
      expect(parseLimit('2m', '')).toEqual({ tokens: 2000000 })
      expect(parseLimit('1.5M', '')).toEqual({ tokens: 1500000 })
      expect(parseLimit('1b', '')).toEqual({ tokens: 1000000000 })
      expect(parseLimit('2.5B', '')).toEqual({ tokens: 2500000000 })
      expect(parseLimit('1g', '')).toEqual({ tokens: 1000000000 })
      expect(parseLimit('1t', '')).toEqual({ tokens: 1000000000000 })
    })

    it('should parse token limits with whitespace', () => {
      expect.assertions(3)

      expect(parseLimit('  1000  ', '')).toEqual({ tokens: 1000 })
      expect(parseLimit('1.5 k', '')).toEqual({ tokens: 1500 })
      expect(parseLimit(' 2 M ', '')).toEqual({ tokens: 2000000 })
    })

    it('should parse model names as token limits', () => {
      expect.assertions(2)

      expect(parseLimit('gpt-4', 'gpt-4')).toEqual({ tokens: 8191 })
      expect(parseLimit('GPT-4', 'gpt-4')).toEqual({ tokens: 8191 })
    })

    it('should parse cost limits from strings', () => {
      expect.assertions(8)

      expect(parseLimit('$0.05', '')).toEqual({ cost: 0.05 })
      expect(parseLimit('$1.50', '')).toEqual({ cost: 1.5 })
      expect(parseLimit('5c', '')).toEqual({ cost: 0.05 })
      expect(parseLimit('10c', '')).toEqual({ cost: 0.1 })
      expect(parseLimit('5 cents', '')).toEqual({ cost: 0.05 })
      expect(parseLimit('1 cent', '')).toEqual({ cost: 0.01 })
      expect(parseLimit('1 dollar', '')).toEqual({ cost: 1 })
      expect(parseLimit('2 dollars', '')).toEqual({ cost: 2 })
    })

    it('should throw error for invalid token format', () => {
      expect.assertions(3)

      expect(() => parseLimit('invalid', '')).toThrow(
        'Invalid token limit format: "invalid"',
      )
      expect(() => parseLimit('1x', '')).toThrow(
        'Invalid token limit format: "1x"',
      )
      expect(() => parseLimit('abc123', '')).toThrow(
        'Invalid cost limit format: "abc123"',
      )
    })

    it('should throw error for invalid cost format', () => {
      expect.assertions(2)

      expect(() => parseLimit('$invalid', '')).toThrow(
        'Invalid cost limit format: "$invalid"',
      )
      expect(() => parseLimit('invalid dollars', '')).toThrow(
        'Invalid cost limit format: "invalid dollars"',
      )
    })

    it('should throw error for invalid cost limit values in strings', () => {
      expect.assertions(4)

      expect(() => parseLimit('$-1', '')).toThrow(
        'Invalid cost limit format: "$-1"',
      )
      expect(() => parseLimit('-5c', '')).toThrow(
        'Invalid cost limit format: "-5c"',
      )
      expect(() => parseLimit('-1 dollar', '')).toThrow(
        'Invalid cost limit format: "-1 dollar"',
      )
      expect(() => parseLimit('-10 cents', '')).toThrow(
        'Invalid cost limit format: "-10 cents"',
      )
    })
  })

  describe('object inputs', () => {
    it('should parse token limit objects', () => {
      expect.assertions(3)

      expect(parseLimit({ tokens: 1000 }, '')).toEqual({ tokens: 1000 })
      expect(parseLimit({ tokens: '1k' }, '')).toEqual({ tokens: 1000 })
      expect(parseLimit({ tokens: 'gpt-4' }, 'gpt-4')).toEqual({ tokens: 8191 })
    })

    it('should throw error for invalid numeric cost limits', () => {
      expect.assertions(4)

      expect(() => parseLimit({ cost: -1 }, '')).toThrow(
        'Invalid cost limit: -1. Must be a positive finite number.',
      )
      expect(() => parseLimit({ cost: Number.NEGATIVE_INFINITY }, '')).toThrow(
        'Invalid cost limit: -Infinity. Must be a positive finite number.',
      )
      expect(() => parseLimit({ cost: Number.POSITIVE_INFINITY }, '')).toThrow(
        'Invalid cost limit: Infinity. Must be a positive finite number.',
      )
      expect(() => parseLimit({ cost: Number.NaN }, '')).toThrow(
        'Invalid cost limit: NaN. Must be a positive finite number.',
      )
    })

    it('should parse cost limit objects', () => {
      expect.assertions(3)

      expect(parseLimit({ cost: 0.05 }, '')).toEqual({ cost: 0.05 })
      expect(parseLimit({ cost: '$0.05' }, '')).toEqual({ cost: 0.05 })
      expect(parseLimit({ cost: '5c' }, '')).toEqual({ cost: 0.05 })
    })

    it('should parse combined token and cost limits', () => {
      expect.assertions(2)

      expect(parseLimit({ tokens: 1000, cost: 0.05 }, '')).toEqual({
        tokens: 1000,
        cost: 0.05,
      })
      expect(parseLimit({ cost: '$0.05', tokens: '1k' }, '')).toEqual({
        tokens: 1000,
        cost: 0.05,
      })
    })

    it('should handle empty objects', () => {
      expect.assertions(1)

      expect(parseLimit({} as TokenLimit & CostLimit, '')).toEqual({})
    })
  })
})

describe('calculateCost', () => {
  it('should calculate cost for supported models', () => {
    expect.assertions(2)

    expect(calculateCost(1000, 'gpt-4')).toBe(0.03)
    expect(calculateCost(2000, 'gpt-4')).toBe(0.06)
  })

  it('should return 0 for unsupported models', () => {
    expect.assertions(2)

    expect(calculateCost(1000, 'unknown-model')).toBe(0)
    expect(calculateCost(1000, 'custom-model')).toBe(0)
  })

  it('should handle fractional token counts', () => {
    expect.assertions(1)

    expect(calculateCost(500, 'gpt-4')).toBe(0.015)
  })

  it('should handle zero tokens', () => {
    expect.assertions(1)

    expect(calculateCost(0, 'gpt-4')).toBe(0)
  })
})

describe('formatCost', () => {
  it('should format costs less than $0.01 with 3 decimal places', () => {
    expect.assertions(3)

    expect(formatCost(0.001)).toBe('$0.001')
    expect(formatCost(0.005)).toBe('$0.005')
    expect(formatCost(0.009)).toBe('$0.009')
  })

  it('should format costs less than $1 with 3 decimal places', () => {
    expect.assertions(3)

    expect(formatCost(0.05)).toBe('$0.050')
    expect(formatCost(0.123)).toBe('$0.123')
    expect(formatCost(0.999)).toBe('$0.999')
  })

  it('should format costs $1 and above with 2 decimal places', () => {
    expect.assertions(3)

    expect(formatCost(1)).toBe('$1.00')
    expect(formatCost(1.5)).toBe('$1.50')
    expect(formatCost(10.99)).toBe('$10.99')
  })

  it('should handle very small costs', () => {
    expect.assertions(1)

    expect(formatCost(0.0001)).toBe('$0.000')
  })

  it('should handle large costs', () => {
    expect.assertions(1)

    expect(formatCost(1000.123)).toBe('$1000.12')
  })
})

describe('formatTokens', () => {
  it('should format small numbers without suffix', () => {
    expect.assertions(3)

    expect(formatTokens(0)).toBe('0')
    expect(formatTokens(500)).toBe('500')
    expect(formatTokens(999)).toBe('999')
  })

  it('should format thousands with k suffix', () => {
    expect.assertions(4)

    expect(formatTokens(1000)).toBe('1.0k')
    expect(formatTokens(1500)).toBe('1.5k')
    expect(formatTokens(10000)).toBe('10.0k')
    expect(formatTokens(999999)).toBe('1000.0k')
  })

  it('should format millions with M suffix', () => {
    expect.assertions(4)

    expect(formatTokens(1000000)).toBe('1.0M')
    expect(formatTokens(1500000)).toBe('1.5M')
    expect(formatTokens(10000000)).toBe('10.0M')
    expect(formatTokens(2500000000)).toBe('2500.0M')
  })

  it('should handle edge cases', () => {
    expect.assertions(2)

    expect(formatTokens(1001)).toBe('1.0k')
    expect(formatTokens(1000001)).toBe('1.0M')
  })
})
