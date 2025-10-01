import type { ModelConfig } from '../types/model-config'

export let supportedModels = {
  openai: {
    'gpt-3.5-turbo': {
      encoding: 'cl100k_base',
      name: 'GPT-3.5 Turbo',
      provider: 'openai',
      deprecated: true,
    },
    'gpt-4.1-mini': {
      encoding: 'cl100k_base',
      name: 'GPT-4.1 Mini',
      provider: 'openai',
    },
    'gpt-4.1-nano': {
      encoding: 'cl100k_base',
      name: 'GPT-4.1 Nano',
      provider: 'openai',
    },
    'gpt-4-turbo': {
      encoding: 'cl100k_base',
      name: 'GPT-4 Turbo',
      provider: 'openai',
    },
    'gpt-4o-mini': {
      encoding: 'o200k_base',
      name: 'GPT-4o Mini',
      provider: 'openai',
    },
    'gpt-4.1': {
      encoding: 'cl100k_base',
      provider: 'openai',
      name: 'GPT-4.1',
    },
    'o3-mini': {
      encoding: 'o200k_base',
      provider: 'openai',
      name: 'O3 Mini',
    },
    'o1-mini': {
      encoding: 'o200k_base',
      provider: 'openai',
      name: 'O1 Mini',
    },
    'gpt-4o': {
      encoding: 'o200k_base',
      provider: 'openai',
      name: 'GPT-4o',
    },
    'gpt-4': {
      encoding: 'cl100k_base',
      provider: 'openai',
      name: 'GPT-4',
    },
    'gpt-5': {
      encoding: 'o200k_base',
      provider: 'openai',
      name: 'GPT-5',
    },
    o1: {
      encoding: 'o200k_base',
      provider: 'openai',
      name: 'O1',
    },
  },

  anthropic: {
    'claude-3.7-sonnet': {
      name: 'Claude 3.7 Sonnet',
      provider: 'anthropic',
    },
    'claude-3.5-sonnet': {
      name: 'Claude 3.5 Sonnet',
      provider: 'anthropic',
    },
    'claude-sonnet-4.5': {
      name: 'Claude Sonnet 4.5',
      provider: 'anthropic',
    },
    'claude-3.5-haiku': {
      name: 'Claude 3.5 Haiku',
      provider: 'anthropic',
    },
    'claude-opus-4.1': {
      name: 'Claude Opus 4.1',
      provider: 'anthropic',
    },
    'claude-sonnet-4': {
      name: 'Claude Sonnet 4',
      provider: 'anthropic',
    },
    'claude-3-opus': {
      provider: 'anthropic',
      name: 'Claude 3 Opus',
    },
    'claude-opus-4': {
      name: 'Claude Opus 4',
      provider: 'anthropic',
    },
  },
} as const satisfies Record<string, Record<string, ModelConfig>>
