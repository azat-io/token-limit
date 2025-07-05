import type { TokenCheckResult } from './token-check-result'

/**
 * Configuration passed to reporters for formatting and displaying results.
 * Contains all check results and display preferences.
 */
export interface ReporterConfig {
  /** Array of token check results to be reported. */
  checks: TokenCheckResult[]

  /**
   * Whether to hide passed checks in the output. Useful for focusing on
   * failures only.
   */
  hidePassed?: boolean

  /**
   * Path to the configuration file that was used. Used in error messages and
   * help text to guide users to the right file for fixes.
   */
  configPath?: string

  /**
   * Whether any of the checks failed. Used to determine exit code and overall
   * status reporting.
   */
  failed: boolean
}
