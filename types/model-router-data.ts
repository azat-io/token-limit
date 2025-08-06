import type { SupportedModelNames } from './supported-model-names'

/**
 * Raw model data from external model routing services (OpenRouter, HuggingFace,
 * etc.).
 *
 * This interface represents the "external view" of model information as
 * provided by third-party services, before it's normalized into our internal
 * ModelConfig format.
 *
 * Key differences from ModelConfig:
 *
 * - Pricing may be per-token instead of per-1k-tokens
 * - Field names match external API responses
 * - Less normalized/standardized data structure
 * - May include provider-specific metadata.
 */
export interface ModelRouterData {
  /** Our internal model identifier that maps to this external model. */
  name: SupportedModelNames

  /**
   * Input token pricing from the external routing service.
   *
   * Note: Router services typically provide pricing per single token, while our
   * internal ModelConfig uses pricing per 1000 tokens. This value needs to be
   * multiplied by 1000 during conversion.
   *
   * @example
   *   0.000003 // $0.000003 per input token (becomes 0.003 per 1k tokens)
   */
  costPer1kTokens: number

  /**
   * Maximum context window from the external service.
   *
   * This represents the total token capacity as reported by the routing
   * service. May differ from our internal contextWindow due to:
   *
   * - Different measurement methods
   * - Provider-specific limitations
   * - API version differences.
   *
   * @example
   *   200000 // 200k tokens as reported by OpenRouter
   */
  contextWindow: number

  /**
   * The external service's canonical model identifier.
   *
   * Some services provide both a "friendly" ID and a canonical slug. The
   * canonical version is typically more stable for API integration.
   *
   * @example
   *   'anthropic/claude-3.5-sonnet'
   */
  canonicalSlug: string

  /**
   * When this data was last fetched from the external service.
   *
   * Important for:
   *
   * - Cache invalidation
   * - Data freshness validation
   * - Update scheduling.
   *
   * @example
   *   '2024-07-19T10:30:00Z'
   */
  lastUpdated: string

  /**
   * The routing service that provided this data.
   *
   * Useful for:
   *
   * - Data source tracking
   * - Service-specific processing logic
   * - Debugging and monitoring.
   */
  source: string
}
