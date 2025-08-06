import fs from 'node:fs/promises'
import prettier from 'prettier'
import { ESLint } from 'eslint'
import path from 'node:path'
import dedent from 'dedent'

import type { SupportedModelNames } from '../types/supported-model-names'
import type { ModelRouterData } from '../types/model-router-data'

import { supportedModels } from '../data'

/** Individual AI model information from OpenRouter. */
interface OpenRouterModel {
  /** Array of supported API parameters for this model. */
  supported_parameters: string[]

  /** Request limits per API call, if any. Can be null. */
  per_request_limits: unknown

  /** Technical architecture details of the model. */
  architecture: Architecture

  /** Information about the top/recommended provider for this model. */
  top_provider: TopProvider

  /** Hugging Face model identifier, if available. Can be null or empty string. */
  hugging_face_id?: string

  /** Canonical slug identifier used for API calls. */
  canonical_slug: string

  /** Maximum context length in tokens that the model supports. */
  context_length: number

  /** Detailed description of the model's capabilities and features. */
  description: string

  /** Pricing information for different types of usage. */
  pricing: Pricing

  /** Unix timestamp when the model was created/added. */
  created: number

  /** Human-readable display name of the model. */
  name: string

  /** Unique identifier for the model (e.g., "anthropic/claude-opus-4"). */
  id: string
}

/** Pricing structure for different types of model usage. */
interface Pricing {
  /** Cost for internal reasoning tokens in USD, if supported. */
  internal_reasoning?: string

  /** Cost for writing to input cache in USD, if supported. */
  input_cache_write?: string

  /** Cost for reading from input cache in USD, if supported. */
  input_cache_read?: string

  /** Cost for web search functionality in USD, if supported. */
  web_search?: string

  /** Cost per output token in USD. */
  completion: string

  /** Cost per API request in USD (usually "0"). */
  request?: string

  /** Cost per input token in USD. */
  prompt: string

  /** Cost per image input in USD, if supported. */
  image?: string
}

/** Model architecture and capability information. */
interface Architecture {
  /** Instruction tuning type, if applicable. Can be null. */
  instruct_type?: string | null

  /** Array of supported output types (e.g., ["text"]). */
  output_modalities: string[]

  /** Array of supported input types (e.g., ["text", "image"]). */
  input_modalities: string[]

  /** Tokenizer type used by the model (e.g., "Claude", "GPT"). */
  tokenizer: string

  /** Overall modality format (e.g., "text+image->text", "text->text"). */
  modality: string
}

/** OpenRouter model match for our supported models. */
interface OpenRouterMatch {
  /** Canonical slug identifier used for API calls. */
  canonicalSlug: string

  /** Maximum context length in tokens that the model supports. */
  contextLength: number

  /** Pricing information for different types of usage. */
  pricing: Pricing

  /** Human-readable display name of the model. */
  name: string

  /** Unique identifier for the model (e.g., "anthropic/claude-opus-4"). */
  id: string
}

/** Information about the recommended provider for this model. */
interface TopProvider {
  /** Maximum completion tokens allowed in a single response. */
  max_completion_tokens?: number

  /** Maximum context length provided by this provider. */
  context_length?: number

  /** Whether the provider applies content moderation. */
  is_moderated: boolean
}

/** Response from OpenRouter API containing list of available models. */
interface Root {
  /** Array of available AI models. */
  data: OpenRouterModel[]
}

/**
 * Fetches the list of AI models from OpenRouter API.
 *
 * @returns A promise that resolves to the list of AI models.
 */
async function fetchOpenRouterModels(): Promise<Root> {
  let response = await fetch('https://openrouter.ai/api/v1/models')

  if (!response.ok) {
    throw new Error(`Failed to fetch models: ${response.statusText}`)
  }

  return (await response.json()) as Root
}

let modelsData = await fetchOpenRouterModels()

let supportedModelIds = Object.entries(supportedModels).flatMap(
  ([_provider, models]) => Object.keys(models),
)

/**
 * Calculates the relevance score of a model based on its ID and target ID.
 *
 * This function uses a combination of exact matches, partial matches, and
 * semantic similarity to determine how well a model matches a target ID.
 *
 * @param model - The model to evaluate.
 * @param targetId - The target model ID to compare against.
 * @returns A score representing the relevance of the model to the target ID.
 */
function calculateRelevance(model: OpenRouterModel, targetId: string): number {
  let score = 0

  function normalizeString(string_: string): string {
    return string_.toLowerCase().replaceAll(/[^\da-z]/gu, '')
  }

  let normalizedTarget = normalizeString(targetId)
  let normalizedModelId = normalizeString(model.id.replace(/^[^/]+\//u, ''))
  let normalizedCanonical = normalizeString(
    model.canonical_slug.replace(/^[^/]+\//u, ''),
  )
  let normalizedName = normalizeString(model.name)

  if (normalizedModelId === normalizedTarget) {
    score += 1000
  }

  if (normalizedCanonical === normalizedTarget) {
    score += 900
  }

  if (normalizedModelId.startsWith(normalizedTarget)) {
    if (normalizedModelId.length === normalizedTarget.length) {
      score += 800
    } else {
      let extraChars = normalizedModelId.length - normalizedTarget.length
      score += Math.max(0, 500 - extraChars * 50)
    }
  }

  if (normalizedCanonical.startsWith(normalizedTarget)) {
    if (normalizedCanonical.length === normalizedTarget.length) {
      score += 700
    } else {
      let extraChars = normalizedCanonical.length - normalizedTarget.length
      score += Math.max(0, 400 - extraChars * 30)
    }
  }

  if (normalizedName.includes(normalizedTarget)) {
    score += 200
  }

  if (isStableModel(model.id)) {
    score += 100
  }

  let targetWords = normalizedTarget.match(/[a-z]+|\d+/gu) ?? []
  let modelWords = normalizedModelId.match(/[a-z]+|\d+/gu) ?? []

  let commonWords = targetWords.filter(word =>
    modelWords.some(
      modelWord => modelWord.includes(word) || word.includes(modelWord),
    ),
  )

  if (commonWords.length < targetWords.length * 0.5) {
    score -= 500
  }

  return score
}

/**
 * Creates a smart mapping of supported model IDs to OpenRouter matches. This
 * function iterates through each supported model ID, finds relevant OpenRouter
 * models based on a relevance score, and selects the best match for each
 * supported model.
 *
 * @returns A map where keys are supported model IDs and values are the best
 *   matching OpenRouter models.
 */
function createSmartMapping(): Map<string, OpenRouterMatch> {
  let openRouterModelMap = new Map<string, OpenRouterMatch>()

  for (let supportedId of supportedModelIds) {
    let candidates = modelsData.data
      .map(model => ({
        relevance: calculateRelevance(model, supportedId),
        model,
      }))
      .filter(({ relevance }) => relevance > 100)
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 10)

    if (candidates.length === 0) {
      console.warn(supportedId, 'cannot be matched with OpenRouter models')
      continue
    }

    let matches: OpenRouterMatch[] = candidates.map(({ model }) => ({
      canonicalSlug: model.canonical_slug,
      contextLength: model.context_length,
      pricing: model.pricing,
      name: model.name,
      id: model.id,
    }))

    let bestMatch = selectBestMatch(matches, supportedId)
    openRouterModelMap.set(supportedId, bestMatch)
  }

  return openRouterModelMap
}

/**
 * Selects the best match from a list of OpenRouter matches based on relevance
 * and cost.
 *
 * This function evaluates each match by calculating a final score that combines
 * relevance and cost. It prefers matches with higher relevance and lower cost,
 * ensuring that the most suitable model is selected for the target ID.
 *
 * @param matches - The list of matches to evaluate.
 * @param targetId - The target model ID to match against.
 * @returns The best match from the list.
 * @throws {Error} If the matches array is empty.
 */
function selectBestMatch(
  matches: OpenRouterMatch[],
  targetId: string,
): OpenRouterMatch {
  if (matches.length === 1) {
    return matches[0]!
  }

  let scoredMatches = matches
    .map(match => {
      let temporaryModel = {
        // eslint-disable-next-line camelcase
        canonical_slug: match.canonicalSlug,
        // eslint-disable-next-line camelcase
        context_length: match.contextLength,
        pricing: match.pricing,
        name: match.name,
        id: match.id,
      } as OpenRouterModel

      let relevance = calculateRelevance(temporaryModel, targetId)

      let totalCost =
        Number.parseFloat(match.pricing.prompt) +
        Number.parseFloat(match.pricing.completion)

      let finalScore = relevance - totalCost * 1000

      return { finalScore, relevance, totalCost, match }
    })
    .sort((a, b) => b.finalScore - a.finalScore)

  return scoredMatches[0]!.match
}

/**
 * Checks if a model ID is considered stable.
 *
 * @param modelId - The model ID to check.
 * @returns True if the model ID is stable, false otherwise.
 */
function isStableModel(modelId: string): boolean {
  let unstablePatterns = [
    /beta/iu,
    /preview/iu,
    /\d{4}-\d{2}-\d{2}/u,
    /alpha/iu,
    /experimental/iu,
    /:thinking/iu,
    /-search-/iu,
    /pro$/iu,
    /high$/iu,
  ]

  return !unstablePatterns.some(pattern => pattern.test(modelId))
}

/**
 * Rounds a number to 6 decimal places.
 *
 * @param value - The number to round.
 * @returns The rounded number.
 */
function roundPrice(value: number): number {
  return Number(value.toFixed(6))
}

let smartModelMap = createSmartMapping()

let result: Record<SupportedModelNames, ModelRouterData> = {} as Record<
  SupportedModelNames,
  ModelRouterData
>

for (let [supportedId, match] of smartModelMap.entries()) {
  result[supportedId as SupportedModelNames] = {
    costPer1kTokens: roundPrice(Number.parseFloat(match.pricing.prompt) * 1000),
    name: supportedId as SupportedModelNames,
    lastUpdated: new Date().toISOString(),
    contextWindow: match.contextLength,
    canonicalSlug: match.canonicalSlug,
    source: 'openrouter',
  }
}

let fileContent = dedent`
  /**
   * This file is auto-generated by scripts/update-open-router-data.ts.
   * Do not edit manually.
   *
   * Last updated: ${new Date().toISOString()}
   */

  import type { SupportedModelNames } from '../types/supported-model-names'
  import type { ModelRouterData } from '../types/model-router-data'

  export let openRouterModels: Record<SupportedModelNames, ModelRouterData> = ${JSON.stringify(
    result,
    null,
    2,
  )} as const
`

let filePath = path.join(import.meta.dirname, '../data/open-router-models.ts')

let prettierConfig = await prettier.resolveConfig(
  path.join(import.meta.dirname, '../.prettierrc'),
)

let formattedContent = await prettier.format(fileContent, {
  ...prettierConfig,
  parser: 'typescript',
})

let eslint = new ESLint({ fix: true })
let results = await eslint.lintText(formattedContent, { filePath })
formattedContent = results[0]!.output!

await fs.writeFile(filePath, formattedContent)
