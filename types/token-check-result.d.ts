/**
 * Result of a single token limit check. Contains information about token count,
 * limits, and whether the check passed or failed.
 */
export interface TokenCheckResult {
  /**
   * Whether the cost check passed the limit.
   *
   * - `true`: Cost is within the limit
   * - `false`: Cost exceeds the limit
   * - `undefined`: No cost limit was set.
   */
  costPassed?: boolean

  /**
   * Token limit for this check. If undefined, no limit was set (unlimited
   * check).
   */
  tokenLimit?: number

  /** Cost limit for this check in USD. If undefined, no cost limit was set. */
  costLimit?: number

  /** Actual token count found in the analyzed files. */
  tokenCount: number

  /**
   * Whether this check is in warning state (exceeds warning threshold but not
   * limit).
   */
  warning?: boolean

  /**
   * Whether the token check passed the limit.
   *
   * - `true`: Token count is within the limit
   * - `false`: Token count exceeds the limit
   * - `undefined`: No limit was set (unlimited check).
   */
  passed?: boolean

  /**
   * Whether the files specified in the check were not found. When true,
   * indicates that the glob patterns didn't match any files.
   */
  missed?: boolean

  /**
   * Optional additional message for the check result. Used for providing
   * context or suggestions when limits are exceeded.
   */
  message?: string

  /** Array of file paths that were analyzed for this check. */
  files: string[]

  /**
   * AI model used for tokenization. Examples: 'gpt-4', 'claude-3.5-sonnet',
   * 'gemini-1.5-pro'.
   */
  model: string

  /** Actual cost in USD for the analyzed files. */
  cost?: number

  /**
   * Human-readable name for this check. Used in output to identify which check
   * failed or passed.
   */
  name: string
}
