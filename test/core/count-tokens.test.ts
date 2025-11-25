import type { Tiktoken } from 'tiktoken'

import { countTokens as countClaudeTokens } from '@anthropic-ai/tokenizer'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { get_encoding as getTokenizerEncoding } from 'tiktoken'

import { getModelConfig } from '../../core/get-model-config'
import { countTokens } from '../../core/count-tokens'

vi.mock(import('@anthropic-ai/tokenizer'), () => ({
  countTokens: vi.fn((text: string) => Math.ceil(text.length / 4)),
}))

vi.mock(import('tiktoken'), () => ({
  // eslint-disable-next-line camelcase
  get_encoding: vi.fn(
    () =>
      ({
        encode: vi.fn((text: string) =>
          Array.from({ length: Math.ceil(text.length / 4) }),
        ),
        free: vi.fn(),
      }) as unknown as Tiktoken,
  ),
}))

vi.mock(import('../../core/get-model-config'), () => ({
  getModelConfig: vi.fn(),
}))

describe('countTokens', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('with model configuration', () => {
    it('should use OpenAI tokenizer for OpenAI models with config', () => {
      expect.assertions(3)

      let mockModelConfig = {
        provider: 'openai' as const,
        encoding: 'cl100k_base',
        name: 'GPT-4',
      }
      vi.mocked(getModelConfig).mockReturnValue(mockModelConfig)

      let result = countTokens('Hello world', 'gpt-4')

      expect(getModelConfig).toHaveBeenCalledWith('gpt-4')
      expect(getTokenizerEncoding).toHaveBeenCalledWith('cl100k_base')
      expect(result).toBe(3)
    })

    it('should use Anthropic tokenizer for Anthropic models with config', () => {
      expect.assertions(3)

      let mockModelConfig = {
        provider: 'anthropic' as const,
        name: 'Claude 3.5 Sonnet',
      }
      vi.mocked(getModelConfig).mockReturnValue(mockModelConfig)

      let result = countTokens('Hello world', 'claude-3.5-sonnet')

      expect(getModelConfig).toHaveBeenCalledWith('claude-3.5-sonnet')
      expect(countClaudeTokens).toHaveBeenCalledWith('Hello world')
      expect(result).toBe(3)
    })

    it('should use correct encoding for different OpenAI models', () => {
      expect.assertions(2)

      let mockModelConfig = {
        provider: 'openai' as const,
        encoding: 'o200k_base',
        name: 'GPT-4o',
      }
      vi.mocked(getModelConfig).mockReturnValue(mockModelConfig)

      countTokens('Test text', 'gpt-4o')

      expect(getModelConfig).toHaveBeenCalledWith('gpt-4o')
      expect(getTokenizerEncoding).toHaveBeenCalledWith('o200k_base')
    })

    it('should fall back when model config provider is unknown', () => {
      expect.assertions(3)

      let mockModelConfig = {
        name: 'Custom Model',
        provider: 'custom',
      }
      vi.mocked(getModelConfig).mockReturnValue(
        mockModelConfig as ReturnType<typeof getModelConfig>,
      )

      let result = countTokens('Hello world', 'custom-model')

      expect(getModelConfig).toHaveBeenCalledWith('custom-model')
      expect(console.warn).toHaveBeenCalledWith(
        'Unknown model "custom-model", using GPT-4 tokenizer as fallback. ' +
          'This may not accurately represent the actual token count for your model.',
      )
      expect(result).toBe(3)
    })
  })

  describe('with provider detection fallback', () => {
    beforeEach(() => {
      vi.mocked(getModelConfig).mockReturnValue(undefined)
    })

    it('should detect OpenAI provider from supported models', () => {
      expect.assertions(2)

      let result = countTokens('Hello world', 'gpt-4')

      expect(getTokenizerEncoding).toHaveBeenCalledWith('cl100k_base')
      expect(result).toBe(3)
    })

    it('should detect Anthropic provider from supported models', () => {
      expect.assertions(2)

      let result = countTokens('Hello world', 'claude-3.5-sonnet')

      expect(countClaudeTokens).toHaveBeenCalledWith('Hello world')
      expect(result).toBe(3)
    })

    it('should match partial model names', () => {
      expect.assertions(1)

      countTokens('Hello', 'gpt-4-turbo-preview')

      expect(getTokenizerEncoding).toHaveBeenCalledWith('cl100k_base')
    })

    it('should be case insensitive', () => {
      expect.assertions(1)

      countTokens('Hello', 'GPT-4')

      expect(getTokenizerEncoding).toHaveBeenCalledWith('cl100k_base')
    })

    it('should handle model names with extra spaces', () => {
      expect.assertions(1)

      countTokens('Hello', '  claude-3.5-sonnet  ')

      expect(countClaudeTokens).toHaveBeenCalledWith('Hello')
    })
  })

  describe('unknown model fallback', () => {
    beforeEach(() => {
      vi.mocked(getModelConfig).mockReturnValue(undefined)
    })

    it('should fall back to GPT-4 tokenizer for unknown models', () => {
      expect.assertions(3)

      let result = countTokens('Hello world', 'unknown-model')

      expect(console.warn).toHaveBeenCalledWith(
        'Unknown model "unknown-model", using GPT-4 tokenizer as fallback. ' +
          'This may not accurately represent the actual token count for your model.',
      )
      expect(getTokenizerEncoding).toHaveBeenCalledWith('cl100k_base')
      expect(result).toBe(3)
    })

    it('should not warn for known models', () => {
      expect.assertions(1)

      countTokens('Hello', 'gpt-4')

      expect(console.warn).not.toHaveBeenCalled()
    })
  })

  describe('empty text handling', () => {
    it('should return 0 tokens for empty string with OpenAI models', () => {
      expect.assertions(1)

      let mockModelConfig = {
        provider: 'openai' as const,
        encoding: 'cl100k_base',
        name: 'GPT-4',
      }
      vi.mocked(getModelConfig).mockReturnValue(mockModelConfig)

      let result = countTokens('', 'gpt-4')

      expect(result).toBe(0)
    })

    it('should handle empty string with Anthropic models', () => {
      expect.assertions(2)

      let mockModelConfig = {
        provider: 'anthropic' as const,
        name: 'Claude 3.5 Sonnet',
      }
      vi.mocked(getModelConfig).mockReturnValue(mockModelConfig)

      let result = countTokens('', 'claude-3.5-sonnet')

      expect(countClaudeTokens).toHaveBeenCalledWith('')
      expect(result).toBe(0)
    })
  })

  describe('error handling', () => {
    it('should handle tiktoken encoding errors gracefully', () => {
      expect.assertions(3)

      let mockEncoder = {
        encode: vi.fn().mockImplementation(() => {
          throw new Error('Encoding failed')
        }),
        free: vi.fn(),
      } as unknown as Tiktoken
      vi.mocked(getTokenizerEncoding).mockReturnValue(mockEncoder)

      let mockModelConfig = {
        provider: 'openai' as const,
        encoding: 'cl100k_base',
        name: 'GPT-4',
      }
      vi.mocked(getModelConfig).mockReturnValue(mockModelConfig)

      let localErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {})

      let result = countTokens('Hello world', 'gpt-4')

      expect(localErrorSpy).toHaveBeenCalledWith(
        'Error counting OpenAI tokens for model "gpt-4":',
        new Error('Encoding failed'),
      )
      expect(result).toBe(3)
      expect(mockEncoder.free).toHaveBeenCalledWith()

      localErrorSpy.mockRestore()
    })

    it('should handle encoder.free() errors gracefully', () => {
      expect.assertions(2)

      let mockEncoder = {
        free: vi.fn().mockImplementation(() => {
          throw new Error('Free failed')
        }),
        encode: vi.fn(() => new Uint32Array([1, 2, 3])),
      } as unknown as Tiktoken
      vi.mocked(getTokenizerEncoding).mockReturnValue(mockEncoder)

      let mockModelConfig = {
        provider: 'openai' as const,
        encoding: 'cl100k_base',
        name: 'GPT-4',
      }
      vi.mocked(getModelConfig).mockReturnValue(mockModelConfig)

      let warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      let result = countTokens('Hello world', 'gpt-4')

      expect(warnSpy).toHaveBeenCalledWith(
        'Failed to free tiktoken encoder:',
        expect.any(Error),
      )
      expect(result).toBe(3)

      warnSpy.mockRestore()
    })

    it('should handle case when encoder is undefined in finally block', () => {
      expect.assertions(2)

      vi.mocked(getTokenizerEncoding).mockImplementation(() => {
        throw new Error('Failed to create encoder')
      })

      let mockModelConfig = {
        provider: 'openai' as const,
        encoding: 'cl100k_base',
        name: 'GPT-4',
      }
      vi.mocked(getModelConfig).mockReturnValue(mockModelConfig)

      let localErrorSpy2 = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {})

      let result = countTokens('Hello world', 'gpt-4')

      expect(localErrorSpy2).toHaveBeenCalledWith(
        'Error counting OpenAI tokens for model "gpt-4":',
        expect.any(Error),
      )
      expect(result).toBe(3)

      localErrorSpy2.mockRestore()
    })
  })

  describe('text variations', () => {
    beforeEach(() => {
      vi.mocked(getTokenizerEncoding).mockReturnValue({
        encode: vi.fn((text: string) =>
          Array.from({ length: Math.ceil(text.length / 4) }),
        ),
        free: vi.fn(),
      } as unknown as Tiktoken)

      let mockModelConfig = {
        provider: 'openai' as const,
        encoding: 'cl100k_base',
        name: 'GPT-4',
      }
      vi.mocked(getModelConfig).mockReturnValue(mockModelConfig)
    })

    it('should handle multiline text', () => {
      expect.assertions(1)

      let MULTILINE_TEXT = 'Line 1\nLine 2\nLine 3'
      let result = countTokens(MULTILINE_TEXT, 'gpt-4')

      expect(result).toBe(Math.ceil(MULTILINE_TEXT.length / 4))
    })

    it('should handle text with special characters', () => {
      expect.assertions(1)

      let SPECIAL_TEXT = 'Hello 世界! 🌍 @#$%^&*()'
      let result = countTokens(SPECIAL_TEXT, 'gpt-4')

      expect(result).toBe(Math.ceil(SPECIAL_TEXT.length / 4))
    })

    it('should handle very long text', () => {
      expect.assertions(1)

      let LONG_TEXT = 'A'.repeat(10000)
      let result = countTokens(LONG_TEXT, 'gpt-4')

      expect(result).toBe(2500)
    })
  })

  describe('real world scenarios', () => {
    it('should handle code snippets', () => {
      expect.assertions(1)

      let CODE_SNIPPET = `
        function calculateTokens(text: string): number {
          return Math.ceil(text.length / 4);
        }
      `

      let mockModelConfig = {
        provider: 'openai' as const,
        encoding: 'cl100k_base',
        name: 'GPT-4',
      }
      vi.mocked(getModelConfig).mockReturnValue(mockModelConfig)

      let result = countTokens(CODE_SNIPPET, 'gpt-4')

      expect(result).toBeGreaterThan(0)
    })

    it('should handle markdown content', () => {
      expect.assertions(1)

      let MARKDOWN_CONTENT = `
        # Title

        This is **bold** text with *italic* formatting.

        - List item 1
        - List item 2

        \`\`\`javascript
        console.log('Hello');
        \`\`\`
      `

      let mockModelConfig = {
        provider: 'anthropic' as const,
        name: 'Claude 3.5 Sonnet',
      }
      vi.mocked(getModelConfig).mockReturnValue(mockModelConfig)

      let result = countTokens(MARKDOWN_CONTENT, 'claude-3.5-sonnet')

      expect(result).toBeGreaterThan(0)
    })
  })

  describe('provider detection edge cases', () => {
    beforeEach(() => {
      vi.mocked(getModelConfig).mockReturnValue(undefined)
    })

    it('should handle model names that partially match multiple providers', () => {
      expect.assertions(1)

      countTokens('Hello', 'gpt')

      expect(getTokenizerEncoding).toHaveBeenCalledWith('cl100k_base')
    })

    it('should handle completely unknown model names', () => {
      expect.assertions(2)

      let result = countTokens('Hello', 'completely-unknown-model-2024')

      expect(console.warn).toHaveBeenCalledWith(
        'Unknown model "completely-unknown-model-2024", using GPT-4 tokenizer as fallback. This may not accurately represent the actual token count for your model.',
      )
      expect(result).toBe(2)
    })
  })
})
