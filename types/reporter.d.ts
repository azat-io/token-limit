import type { ReporterConfig } from './reporter-config'

/**
 * Interface for outputting token limit check results. Implementations can
 * format results for different audiences (human-readable, JSON, etc.).
 */
export interface Reporter {
  /**
   * Output the results of token limit checks.
   *
   * @param config - Configuration containing check results and display
   *   preferences.
   */
  results(config: ReporterConfig): void

  /**
   * Output error information when token limit checking fails.
   *
   * @param error - Error that occurred during token limit checking.
   */
  error(error: Error): void
}
