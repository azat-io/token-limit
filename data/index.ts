import type { ModelConfig } from '../types/model-config'

export let supportedModels = {
  openai: {
    'gpt-3.5-turbo': {
      costPer1kTokens: { output: 0.0015, input: 0.0005 },
      encoding: 'cl100k_base',
      contextWindow: 16_385,
      name: 'GPT-3.5 Turbo',
      provider: 'openai',
      deprecated: true,
      maxOutput: 4096,
    },
    'gpt-4.1-mini': {
      costPer1kTokens: { input: 0.015, output: 0.06 },
      contextWindow: 1_048_576,
      encoding: 'cl100k_base',
      name: 'GPT-4.1 Mini',
      provider: 'openai',
      maxOutput: 32_768,
    },
    'gpt-4.1-nano': {
      costPer1kTokens: { input: 0.005, output: 0.02 },
      contextWindow: 1_048_576,
      encoding: 'cl100k_base',
      name: 'GPT-4.1 Nano',
      provider: 'openai',
      maxOutput: 32_768,
    },
    'gpt-4o-mini': {
      costPer1kTokens: { input: 0.00015, output: 0.0006 },
      encoding: 'o200k_base',
      contextWindow: 128_000,
      name: 'GPT-4o Mini',
      provider: 'openai',
      maxOutput: 16_384,
    },
    'gpt-4-turbo': {
      costPer1kTokens: { output: 0.03, input: 0.01 },
      encoding: 'cl100k_base',
      contextWindow: 128_000,
      name: 'GPT-4 Turbo',
      provider: 'openai',
      maxOutput: 4096,
    },
    'gpt-4.1': {
      costPer1kTokens: { output: 0.12, input: 0.03 },
      contextWindow: 1_048_576,
      encoding: 'cl100k_base',
      provider: 'openai',
      maxOutput: 32_768,
      name: 'GPT-4.1',
    },
    'o3-mini': {
      costPer1kTokens: { output: 0.016, input: 0.004 },
      encoding: 'o200k_base',
      contextWindow: 200_000,
      provider: 'openai',
      maxOutput: 100_000,
      name: 'O3 Mini',
    },
    'o1-mini': {
      costPer1kTokens: { output: 0.012, input: 0.003 },
      encoding: 'o200k_base',
      contextWindow: 128_000,
      provider: 'openai',
      maxOutput: 65_536,
      name: 'O1 Mini',
    },
    'gpt-4o': {
      costPer1kTokens: { output: 0.015, input: 0.005 },
      encoding: 'o200k_base',
      contextWindow: 128_000,
      provider: 'openai',
      maxOutput: 16_384,
      name: 'GPT-4o',
    },
    'gpt-4': {
      costPer1kTokens: { output: 0.06, input: 0.03 },
      encoding: 'cl100k_base',
      contextWindow: 8192,
      provider: 'openai',
      maxOutput: 4096,
      name: 'GPT-4',
    },
    o1: {
      costPer1kTokens: { input: 0.015, output: 0.06 },
      encoding: 'o200k_base',
      contextWindow: 200_000,
      provider: 'openai',
      maxOutput: 100_000,
      name: 'O1',
    },
  },

  anthropic: {
    'claude-3.7-sonnet': {
      costPer1kTokens: { output: 0.015, input: 0.003 },
      name: 'Claude 3.7 Sonnet',
      contextWindow: 200_000,
      provider: 'anthropic',
      maxOutput: 8192,
    },
    'claude-3.5-sonnet': {
      costPer1kTokens: { output: 0.015, input: 0.003 },
      name: 'Claude 3.5 Sonnet',
      contextWindow: 200_000,
      provider: 'anthropic',
      maxOutput: 8192,
    },
    'claude-3.5-haiku': {
      costPer1kTokens: { input: 0.0008, output: 0.004 },
      name: 'Claude 3.5 Haiku',
      contextWindow: 200_000,
      provider: 'anthropic',
      maxOutput: 8192,
    },
    'claude-sonnet-4': {
      costPer1kTokens: { output: 0.02, input: 0.004 },
      name: 'Claude Sonnet 4',
      contextWindow: 500_000,
      provider: 'anthropic',
      maxOutput: 8192,
    },
    'claude-3-opus': {
      costPer1kTokens: { output: 0.075, input: 0.015 },
      contextWindow: 200_000,
      provider: 'anthropic',
      name: 'Claude 3 Opus',
      maxOutput: 4096,
    },
    'claude-opus-4': {
      costPer1kTokens: { output: 0.1, input: 0.02 },
      contextWindow: 500_000,
      name: 'Claude Opus 4',
      provider: 'anthropic',
      maxOutput: 8192,
    },
  },
} as const satisfies Record<string, Record<string, ModelConfig>>
