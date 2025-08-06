import type { SupportedModelNames } from '../types/supported-model-names'
import type { TokenLimit, CostLimit } from '../types/token-limit-config'
import type { ModelRouterData } from '../types/model-router-data'

import { openRouterModels } from '../data/open-router-models'

/** Parsed limit configuration with normalized values. */
interface ParsedLimit {
  /** Token limit (if specified). */
  tokens?: number

  /** Cost limit in USD (if specified). */
  cost?: number
}

/**
 * Parse limit configuration into normalized format.
 *
 * @param limit - The limit configuration to parse. Can be a simple
 *   number/string for token limits, token limit object, cost limit object, or
 *   combined limits.
 * @param model - Model name to use for context window limits.
 * @returns The parsed limit configuration with normalized values.
 */
export function parseLimit(
  limit: (TokenLimit & CostLimit) | TokenLimit | CostLimit | string | number,
  model: string,
): ParsedLimit {
  if (typeof limit === 'string' || typeof limit === 'number') {
    if (typeof limit === 'string') {
      let normalizedLimit = limit.toLowerCase().trim()
      if (
        normalizedLimit.includes('$') ||
        normalizedLimit.includes('c') ||
        normalizedLimit.includes('cent') ||
        normalizedLimit.includes('dollar')
      ) {
        return {
          cost: parseCostLimit(limit),
        }
      }
    }

    return {
      tokens: parseTokenLimit(limit, model),
    }
  }

  let result: ParsedLimit = {}

  if ('tokens' in limit) {
    result.tokens = parseTokenLimit(limit.tokens, model)
  }

  if ('cost' in limit) {
    result.cost = parseCostLimit(limit.cost)
  }

  return result
}

/**
 * Calculate cost for given tokens and model.
 *
 * @param tokens - Number of tokens to calculate cost for.
 * @param model - Model name to get pricing information from.
 * @returns The calculated cost in USD.
 */
export function calculateCost(tokens: number, model: string): number {
  let currentModel = openRouterModels[
    model as SupportedModelNames
  ] as unknown as ModelRouterData | undefined

  let costPer1k: number = currentModel?.costPer1kTokens ?? 0
  if (!costPer1k) {
    return 0
  }

  let tokensInThousands = tokens / 1000

  return tokensInThousands * costPer1k
}

/**
 * Format tokens as a readable string.
 *
 * @param tokens - Number of tokens to format.
 * @returns Formatted tokens string.
 */
export function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`
  }
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}k`
  }
  return tokens.toLocaleString()
}

/**
 * Format cost as a readable string.
 *
 * @param cost - Cost value in USD.
 * @returns Formatted cost string.
 */
export function formatCost(cost: number): string {
  if (cost < 0.01) {
    return `$${cost.toFixed(3)}`
  }

  return `$${cost.toFixed(cost < 1 ? 3 : 2)}`
}

/**
 * Parse token limit from various formats.
 *
 * @param limit - The token limit to parse. Can be a number (tokens), string
 *   with suffixes (100k, 1.5m), or model name.
 * @param model - Model name to use for context window limits.
 * @returns The parsed token limit.
 */
function parseTokenLimit(limit: string | number, model: string): number {
  if (typeof limit === 'number') {
    if (!Number.isFinite(limit) || limit < 0) {
      throw new Error(
        `Invalid token limit: ${limit}. Must be a positive finite number.`,
      )
    }
    return Math.floor(limit)
  }

  let normalizedLimit = limit.toLowerCase().trim()

  let currentModel = openRouterModels[
    model as SupportedModelNames
  ] as unknown as ModelRouterData | undefined

  if (currentModel?.contextWindow) {
    return currentModel.contextWindow
  }

  let match = normalizedLimit.match(
    /^(?<value>\d+(?:\.\d+)?)\s*(?<suffix>[bgkmt]?)$/u,
  )
  if (match?.groups?.['value']) {
    let value = Number.parseFloat(match.groups['value'])

    let suffix = match.groups['suffix']!

    switch (suffix) {
      case 'k':
        return Math.floor(value * 1000)
      case 'm':
        return Math.floor(value * 1_000_000)
      case 'b':
        return Math.floor(value * 1_000_000_000)
      case 'g':
        return Math.floor(value * 1_000_000_000)
      case 't':
        return Math.floor(value * 1_000_000_000_000)
      default:
        return Math.floor(value)
    }
  }

  throw new Error(
    `Invalid token limit format: "${limit}". Expected formats: number, "100k", "1.5m", "2b", or model name.`,
  )
}

/**
 * Parse cost limit from various formats to USD.
 *
 * @param cost - The cost limit to parse. Can be a number (dollars), string with
 *   currency symbols ($0.05), cents (5c, 10 cents), or text format (1 dollar).
 * @returns The parsed cost limit in USD.
 */
function parseCostLimit(cost: string | number): number {
  if (typeof cost === 'number') {
    if (!Number.isFinite(cost) || cost < 0) {
      throw new Error(
        `Invalid cost limit: ${cost}. Must be a positive finite number.`,
      )
    }
    return cost
  }

  let normalizedCost = cost.toLowerCase().trim()

  let patterns = [
    /* $0.05. */
    /^\$(?<amount>\d+(?:\.\d+)?)$/u,
    /* 5c, 10c. */
    /^(?<amount>\d+(?:\.\d+)?)c$/u,
    /* 5 cents, 1 cent, 10 cents. */
    /^(?<amount>\d+(?:\.\d+)?)\s+cents?$/u,
    /* 1 dollar, 2 dollars. */
    /^(?<amount>\d+(?:\.\d+)?)\s+dollars?$/u,
    /* Plain number as string. */
    /^(?<amount>\d+(?:\.\d+)?)$/u,
  ]

  for (let pattern of patterns) {
    let match = normalizedCost.match(pattern)
    if (match?.groups?.['amount']) {
      let value = Number.parseFloat(match.groups['amount'])

      if (normalizedCost.includes('c') || normalizedCost.includes('cent')) {
        return value / 100
      }

      return value
    }
  }

  throw new Error(
    `Invalid cost limit format: "${cost}". Expected formats: number, "$0.05", "5c", "10 cents", or "1 dollar".`,
  )
}
