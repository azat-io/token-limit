import type { ModelConfig } from '../types/model-config'

import { supportedModels } from '../data'

/**
 * Get model configuration from supported models data.
 *
 * @param modelName - Name of the model to get configuration for.
 * @returns Model configuration or undefined if not found.
 */
export function getModelConfig(modelName: string): ModelConfig | undefined {
  for (let provider of Object.values(supportedModels)) {
    if (modelName in provider) {
      return provider[modelName as keyof typeof provider]
    }
  }
  return undefined
}
