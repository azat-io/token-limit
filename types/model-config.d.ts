/**
 * Configuration object that defines the capabilities and limits of an AI model.
 *
 * This interface provides comprehensive metadata about AI models from different
 * providers (OpenAI, Anthropic, Google, etc.) including tokenization settings,
 * context windows, output limits, pricing, and feature support.
 *
 * Used by the token counting system to:
 *
 * - Apply correct tokenization for each model
 * - Validate content against context window limits
 * - Calculate API costs
 * - Filter models by capabilities
 * - Provide warnings about deprecated models.
 */
export interface ModelConfig {
  /**
   * List of special capabilities this model supports (optional).
   *
   * Helps filter and select appropriate models for specific tasks:
   *
   * - `'vision'` - Can analyze images, charts, diagrams
   * - `'code'` - Optimized for programming tasks
   * - `'function-calling'` - Supports structured function/tool calls
   * - `'reasoning'` - Enhanced logical reasoning (o-series models)
   * - `'multimodal'` - Supports multiple input types
   * - `'streaming'` - Supports real-time response streaming.
   */
  capabilities?: string[]

  /**
   * Whether this model is deprecated and scheduled for removal (optional).
   *
   * When `true`:
   *
   * - Model may stop working in the future
   * - Should show warnings to users
   * - Recommend migration to newer models
   * - May have reduced support/features.
   *
   * @example
   *   true // GPT-3.5-turbo is being phased out
   *
   * @default false
   */
  deprecated?: boolean

  /**
   * The tokenization encoding used by this model.
   *
   * Different models use different tokenization algorithms that split text into
   * tokens differently. This affects token count accuracy.
   *
   * Common encodings:
   *
   * - `'cl100k_base'` - Used by GPT-4, GPT-3.5 (most common)
   * - `'o200k_base'` - Used by GPT-4o and o-series models
   * - `'p50k_base'` - Used by older GPT-3 models
   * - `'r50k_base'` - Used by Codex models
   * - `undefined` - For non-OpenAI models (Claude, Gemini) that use their own
   *   tokenizers.
   *
   * @example
   *   ;'cl100k_base' | 'o200k_base' | 'p50k_base'
   *
   * @see {@link https://github.com/openai/tiktoken/blob/main/tiktoken_ext/openai_public.py} OpenAI tokenization registry
   */
  encoding?: string

  /**
   * The AI provider/company that created and hosts this model.
   *
   * Used for:
   *
   * - Routing to correct tokenization logic
   * - Grouping models by provider in UI
   * - Provider-specific API integrations
   * - Billing and cost tracking.
   *
   * @example
   *   ;'openai' | 'anthropic' | 'google' | 'meta' | 'mistral'
   */
  provider: string

  /**
   * The human-readable name of the model.
   *
   * Used for display purposes in UI, documentation, and logs. Should be
   * descriptive and user-friendly.
   *
   * @example
   *   ;('GPT-4', 'Claude 3.5 Sonnet', 'Gemini Pro')
   */
  name: string
}
