import type { SupportedModelNames } from './supported-model-names'

/**
 * Configuration for a single token limit check. Defines how to analyze files
 * for token count and what limits to apply.
 */
export interface TokenCheck {
  /**
   * Limit configuration. Can be:
   *
   * - Simple number/string for token limits: 1000, "5k", "claude-3.5-sonnet"
   * - Token limit object: { tokens: 1000 }
   * - Cost limit object: { cost: 0.01 } or { cost: "$0.05" }
   * - Combined limits: { tokens: 1000, cost: 0.01 }
   */
  limit?: (TokenLimit & CostLimit) | TokenLimit | CostLimit | string | number

  /**
   * AI model to use for tokenization. Different models have different
   * tokenizers.
   *
   * @default 'gpt-4'
   */
  model?: SupportedModelNames

  /**
   * Relative paths to files to analyze for tokens. Could be a path "CLAUDE.md",
   * a pattern "docs/_.md" or an array ["CLAUDE.md", "docs/_.md",
   * "!docs/internal.md"].
   */
  path: string[] | string

  /**
   * Warning threshold as a percentage (0-1). When usage exceeds this threshold,
   * a warning is shown but the check doesn't fail.
   *
   * @default 0.8
   */
  warnThreshold?: number

  /**
   * Always show cost information even when using token limits.
   *
   * @default false
   */
  showCost?: boolean

  /** The name of the current section. Useful if you have multiple sections. */
  name?: string
}

/** Cost-based limit configuration. */
export interface CostLimit {
  /**
   * Cost limit in various formats:
   *
   * - Numbers: 0.01 (dollars)
   * - With currency symbol: "$0.05"
   * - Cents: "5c", "10 cents", "1 cent"
   * - Text format: "5 cents", "1 dollar"
   */
  cost: string | number
}

/** Token-based limit configuration. */
export interface TokenLimit {
  /**
   * Token limit. Format: "1000", "5k", "10K" or with context window names like
   * "claude-3.5-sonnet" (200k)
   */
  tokens: string | number
}

/**
 * Complete token limit configuration. An array of token checks that define how
 * to analyze different sets of files for token limits.
 *
 * Each check in the configuration can target different files, use different
 * models, and have different limits. This allows for flexible token management
 * across a project.
 */
export type TokenLimitConfig = TokenCheck[]
