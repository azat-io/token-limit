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
 * - Provide warnings about deprecated models
 */
export interface ModelConfig {
  /**
   * Pricing information for API usage (optional).
   *
   * Costs are typically measured per 1000 tokens and often differ between input
   * (prompt) and output (response) tokens. Input is usually cheaper.
   *
   * Useful for:
   *
   * - Cost estimation before API calls
   * - Budget planning and optimization
   * - Comparing model cost-effectiveness
   * - Usage analytics and reporting
   *
   * @example
   *   {
   *     "input": 0.01, // $0.01 per 1k input tokens
   *     "output": 0.03 // $0.03 per 1k output tokens
   *   }
   */
  costPer1kTokens?: {
    /** Cost per 1000 output tokens (USD) */
    output: number

    /** Cost per 1000 input tokens (USD) */
    input: number
  }

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
   * - `'streaming'` - Supports real-time response streaming
   */
  capabilities?: string[]

  /**
   * Maximum number of tokens the model can process in a single request.
   *
   * This includes both input tokens (your prompt/content) and output tokens
   * (the model's response). For example, if contextWindow is 128000 and you
   * send 120000 tokens of input, only 8000 tokens remain for the response.
   *
   * Context windows vary dramatically:
   *
   * - Small: 4k-16k tokens (~3-12k words)
   * - Medium: 32k-128k tokens (~24-96k words)
   * - Large: 200k-1M+ tokens (~150k-750k+ words)
   *
   * @example
   *   128000 // 128k tokens = ~96k words = ~300 pages
   */
  contextWindow: number

  /**
   * Whether this model is deprecated and scheduled for removal (optional).
   *
   * When `true`:
   *
   * - Model may stop working in the future
   * - Should show warnings to users
   * - Recommend migration to newer models
   * - May have reduced support/features
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
   *   tokenizers
   *
   * @example
   *   ;'cl100k_base' | 'o200k_base' | 'p50k_base'
   *
   * @see {@link https://github.com/openai/tiktoken/blob/main/tiktoken_ext/openai_public.py} OpenAI tokenization registry
   */
  encoding?: string

  /**
   * Maximum number of tokens the model can generate in its response.
   *
   * This is separate from and counted within the contextWindow. Some models
   * have different limits for input vs output tokens. Critical for:
   *
   * - Long-form content generation
   * - Code generation
   * - Detailed analysis tasks
   *
   * Note: Actual output is often limited by the remaining context window space
   * after accounting for input tokens.
   *
   * @example
   *   4096 // Can generate up to ~3k words in response
   */
  maxOutput: number

  /**
   * The AI provider/company that created and hosts this model.
   *
   * Used for:
   *
   * - Routing to correct tokenization logic
   * - Grouping models by provider in UI
   * - Provider-specific API integrations
   * - Billing and cost tracking
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
