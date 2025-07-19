import { describe, expect, it } from 'vitest'

import { getModelConfig } from '../../core/get-model-config'

describe('getModelConfig', () => {
  it('should return model configuration for a known model', () => {
    let modelName = 'gpt-4o'
    let config = getModelConfig(modelName)
    expect(config).toBeDefined()
    expect(config?.name).toBe('GPT-4o')
  })

  it('should return undefined for an unknown model', () => {
    let modelName = 'unknown-model'
    let config = getModelConfig(modelName)
    expect(config).toBeUndefined()
  })

  it('should handle case sensitivity in model names', () => {
    let modelName = 'GPT-4O'
    let config = getModelConfig(modelName)
    expect(config).toBeUndefined() // Assuming the model names are case-sensitive
  })
})
