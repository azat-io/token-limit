import type { TiktokenEncoding } from 'tiktoken'

import { countTokens as countClaudeTokensLocal } from '@anthropic-ai/tokenizer'
import { get_encoding as getEncoding } from 'tiktoken'

import { getModelConfig } from './get-model-config'
import { supportedModels } from '../data'
import { AnthropicAPIClient } from './anthropic-api-client'
import { getAnthropicConfig } from './anthropic-config'

/**
 * Counts tokens for OpenAI models using tiktoken.
 *
 * Uses the appropriate encoding based on the model configuration. Different
 * OpenAI models may use different encodings (e.g., 'cl100k_base' for GPT-4,
 * 'o200k_base' for GPT-4o).
 *
 * @example
 *   ;```typescript
 *   const tokens = countOpenAITokens('Hello world!', 'gpt-4o', 'o200k_base')
 *   console.log(tokens) // e.g., 3
 *   ```
 *
 * @param {string} text - The text to tokenize and count
 * @param {string} model - The OpenAI model name (e.g., 'gpt-4o',
 *   'gpt-3.5-turbo')
 * @param {TiktokenEncoding} encoding - The encoding to use for tokenization
 * @returns {number} The number of tokens in the text according to the model's
 *   tokenizer. If tokenization fails, returns an approximation based on
 *   character count (text.length / 4), which is a rough estimate for English
 *   text.
 */
let countOpenAITokens = (
  text: string,
  model: string,
  encoding: TiktokenEncoding = 'cl100k_base',
): number => {
  if (text.length === 0) {
    return 0
  }

  let encoder
  try {
    encoder = getEncoding(encoding)
    let tokens = encoder.encode(text)
    return tokens.length
  } catch (error) {
    console.error(`Error counting OpenAI tokens for model "${model}":`, error)
    return Math.ceil(text.length / 4)
  } finally {
    if (encoder) {
      try {
        encoder.free()
      } catch (freeError) {
        console.warn('Failed to free tiktoken encoder:', freeError)
      }
    }
  }
}

// Global API client instance
let apiClient: AnthropicAPIClient | null = null

/**
 * Initialize the Anthropic API client with configuration
 */
function initializeAPIClient(): AnthropicAPIClient | null {
  if (apiClient) return apiClient
  
  try {
    const config = getAnthropicConfig()
    if (config.enableAPI && config.apiKey) {
      apiClient = new AnthropicAPIClient(config)
      return apiClient
    }
  } catch (error) {
    console.warn('Failed to initialize Anthropic API client:', error)
  }
  
  return null
}

/**
 * Count tokens for Anthropic models using hybrid approach
 */
async function countAnthropicTokens(text: string, model: string): Promise<number> {
  if (text.length === 0) {
    return 0
  }

  // Try API first
  const client = initializeAPIClient()
  if (client) {
    try {
      return await client.countTokens(text, model)
    } catch (error) {
      console.warn(`API token counting failed for ${model}, falling back to local:`, error)
    }
  }

  // Fallback to local tokenizer
  try {
    return countClaudeTokensLocal(text)
  } catch (error) {
    console.error(`Local token counting failed for ${model}:`, error)
    // Ultimate fallback: character-based estimation
    return Math.ceil(text.length / 4)
  }
}

/**
 * Detects the AI provider based on the model name. This function checks the
 * model name against known patterns for OpenAI and Anthropic models. If the
 * model name matches any known OpenAI or Anthropic model, it returns the
 * corresponding provider.
 *
 * @param {string} model - The AI model name to check (e.g., 'gpt-4',
 *   'claude-3.5-sonnet').
 * @returns {string | null} The provider name ('openai' or 'anthropic') if the
 *   model matches known patterns, or null if it does not match any known
 *   models.
 */
let detectProviderFromSupportedModels = (model: string): string | null => {
  let normalizedInput = model.toLowerCase().trim()

  for (let [provider, models] of Object.entries(supportedModels)) {
    for (let supportedModel of Object.keys(models)) {
      let normalizedSupported = supportedModel.toLowerCase()

      if (
        normalizedInput === normalizedSupported ||
        normalizedInput.startsWith(normalizedSupported) ||
        normalizedSupported.startsWith(normalizedInput)
      ) {
        return provider
      }
    }
  }

  return null
}

/**
 * Counts tokens in text for the specified AI model (async version).
 *
 * This is the main entry point for token counting across different AI
 * providers. It automatically detects the model type and uses the appropriate
 * tokenizer:
 *
 * - OpenAI models (GPT-4, GPT-3.5): Uses tiktoken with cl100k_base encoding
 * - Anthropic models (Claude): Uses Anthropic's API or local tokenizer fallback
 * - Unknown models: Falls back to OpenAI tokenizer with warning
 *
 * @example
 *   ;```typescript
 *   // Count tokens for different models
 *   const gptTokens = await countTokens('Hello world!', 'gpt-4')
 *   const claudeTokens = await countTokens('Hello world!', 'claude-3.5-sonnet')
 *   const unknownTokens = await countTokens('Hello world!', 'custom-model')
 *
 *   // Use in token limit analysis
 *   const content = 'Your long text content here...'
 *   const model = 'claude-3.5-sonnet'
 *   const tokens = await countTokens(content, model)
 *
 *   if (tokens > 200000) {
 *     console.warn('Content exceeds Claude context window')
 *   }
 *   ```
 *
 * @param {string} text - The text content to analyze for token count. Can be
 *   any string including code, markdown, or plain text.
 * @param {string} model - The AI model identifier. Supported formats:
 *
 *   - OpenAI: 'gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo', etc.
 *   - Anthropic: 'claude-3.5-sonnet', 'claude-3-opus', 'claude-3-haiku', etc.
 *   - Custom: Any string (will use GPT-4 tokenizer as fallback)
 *
 * @returns {Promise<number>} The number of tokens in the provided text according to the
 *   model's tokenization rules. This count represents how the model would
 *   internally process the text and is crucial for context window management.
 * @see {@link https://platform.openai.com/docs/guides/text-generation/managing-tokens} OpenAI Token Guide
 * @see {@link https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/long-context-tips} Claude Context Guide
 */
export const countTokens = async (text: string, model: string): Promise<number> => {
  let modelConfig = getModelConfig(model)

  if (modelConfig) {
    if (modelConfig.provider === 'openai') {
      return countOpenAITokens(
        text,
        model,
        modelConfig.encoding as TiktokenEncoding,
      )
    }

    if (modelConfig.provider === 'anthropic') {
      return await countAnthropicTokens(text, model)
    }
  }

  let detectedProvider = detectProviderFromSupportedModels(model)

  if (detectedProvider === 'openai') {
    return countOpenAITokens(text, model)
  }

  if (detectedProvider === 'anthropic') {
    return await countAnthropicTokens(text, model)
  }

  console.warn(
    `Unknown model "${model}", using GPT-4 tokenizer as fallback. ` +
      `This may not accurately represent the actual token count for your model.`,
  )
  return countOpenAITokens(text, 'gpt-4')
}

/**
 * Counts tokens in text for the specified AI model (synchronous version).
 *
 * This is the synchronous version that maintains backward compatibility.
 * For Anthropic models, it uses local tokenizer only (no API calls).
 *
 * @param {string} text - The text content to analyze for token count.
 * @param {string} model - The AI model identifier.
 * @returns {number} The number of tokens in the provided text.
 */
export const countTokensSync = (text: string, model: string): number => {
  let modelConfig = getModelConfig(model)

  if (modelConfig) {
    if (modelConfig.provider === 'openai') {
      return countOpenAITokens(
        text,
        model,
        modelConfig.encoding as TiktokenEncoding,
      )
    }

    if (modelConfig.provider === 'anthropic') {
      // Use local tokenizer for sync version
      try {
        return countClaudeTokensLocal(text)
      } catch (error) {
        console.error(`Local token counting failed for ${model}:`, error)
        return Math.ceil(text.length / 4)
      }
    }
  }

  let detectedProvider = detectProviderFromSupportedModels(model)

  if (detectedProvider === 'openai') {
    return countOpenAITokens(text, model)
  }

  if (detectedProvider === 'anthropic') {
    try {
      return countClaudeTokensLocal(text)
    } catch (error) {
      console.error(`Local token counting failed for ${model}:`, error)
      return Math.ceil(text.length / 4)
    }
  }

  console.warn(
    `Unknown model "${model}", using GPT-4 tokenizer as fallback. ` +
      `This may not accurately represent the actual token count for your model.`,
  )
  return countOpenAITokens(text, 'gpt-4')
}
