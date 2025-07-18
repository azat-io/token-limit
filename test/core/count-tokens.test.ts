import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { countTokens, countTokensSync } from '../../core/count-tokens';
import { tokenTestCases, modelTestCases } from '../fixtures/token-test-data';
import { getAnthropicConfig } from '../../core/anthropic-config';

// Mock the Anthropic API client
const mockApiClient = {
  countTokens: vi.fn().mockResolvedValue(10),
  getCachedResult: vi.fn().mockReturnValue(null),
  canMakeRequest: vi.fn().mockReturnValue(true),
};

// Mock the config module
vi.mock('../../core/anthropic-config', () => ({
  getAnthropicConfig: vi.fn().mockReturnValue({
    apiKey: 'test-key',
    enableAPI: true,
    enableCaching: true,
    cacheSize: 1000,
    rateLimitRpm: 60,
    timeout: 30000,
  }),
  validateAnthropicConfig: vi.fn(),
}));

vi.mock('../../core/anthropic-api-client', () => ({
  AnthropicAPIClient: vi.fn().mockImplementation(() => mockApiClient),
}));

describe('countTokens', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset mock values
    mockApiClient.countTokens.mockResolvedValue(10);
    mockApiClient.getCachedResult.mockReturnValue(null);
    mockApiClient.canMakeRequest.mockReturnValue(true);
    
    // Reset config mock to default
    vi.mocked(getAnthropicConfig).mockReturnValue({
      apiKey: 'test-key',
      enableAPI: true,
      enableCaching: true,
      cacheSize: 1000,
      rateLimitRpm: 60,
      timeout: 30000,
    });
    
    // Reset environment variables
    delete process.env['ANTHROPIC_API_KEY'];
    delete process.env['ANTHROPIC_ENABLE_API'];
    delete process.env['ANTHROPIC_ENABLE_CACHING'];
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Anthropic models - API enabled', () => {
    beforeEach(() => {
      process.env['ANTHROPIC_API_KEY'] = 'test-key';
      process.env['ANTHROPIC_ENABLE_API'] = 'true';
    });

    it.each(tokenTestCases)('should count tokens for: $description', async ({ text, expected }) => {
      // Mock the API client to return the expected token count
      mockApiClient.countTokens.mockResolvedValueOnce(expected.api);
      
      const result = await countTokens(text, 'claude-sonnet-4');
      expect(result).toBe(expected.api);
    });

    it.each(modelTestCases)('should handle model: $description', async ({ model, text }) => {
      const result = await countTokens(text, model);
      expect(result).toBeGreaterThan(0);
      expect(typeof result).toBe('number');
    });

    it('should return 0 for empty string', async () => {
      const result = await countTokens('', 'claude-sonnet-4');
      expect(result).toBe(0);
    });

    it('should handle very long text', async () => {
      const longText = 'This is a very long text. '.repeat(1000);
      // Mock the API client to return a large number for long text
      mockApiClient.countTokens.mockResolvedValueOnce(2000);
      const result = await countTokens(longText, 'claude-sonnet-4');
      expect(result).toBeGreaterThan(1000);
    });
  });

  describe('Anthropic models - API disabled', () => {
    beforeEach(() => {
      // Mock config to disable API
      vi.mocked(getAnthropicConfig).mockReturnValue({
        enableAPI: false,
        enableCaching: true,
        cacheSize: 1000,
        rateLimitRpm: 60,
        timeout: 30000,
      });
    });

    it('should fall back to local tokenizer when API is disabled', async () => {
      const result = await countTokens('Hello world', 'claude-sonnet-4');
      expect(result).toBeGreaterThan(0);
      expect(typeof result).toBe('number');
    });

    it('should match sync version when API is disabled', async () => {
      const text = 'Test text for consistency';
      // When API is disabled, it should fall back to local tokenizer
      const asyncResult = await countTokens(text, 'claude-sonnet-4');
      const syncResult = countTokensSync(text, 'claude-sonnet-4');
      expect(asyncResult).toBe(syncResult);
    });
  });

  describe('Error handling', () => {
    beforeEach(() => {
      process.env['ANTHROPIC_API_KEY'] = 'test-key';
      process.env['ANTHROPIC_ENABLE_API'] = 'true';
    });

    it('should handle API errors gracefully', async () => {
      // Mock API failure
      mockApiClient.countTokens.mockRejectedValueOnce(new Error('API Error'));

      const result = await countTokens('test text', 'claude-sonnet-4');
      expect(result).toBeGreaterThan(0); // Should fallback to local counting
    });

    it('should handle rate limiting', async () => {
      // Mock rate limit exceeded
      mockApiClient.countTokens.mockRejectedValueOnce(new Error('Rate limit exceeded'));
      mockApiClient.canMakeRequest.mockReturnValueOnce(false);

      const result = await countTokens('test text', 'claude-sonnet-4');
      expect(result).toBeGreaterThan(0); // Should fallback to local counting
    });

    it('should handle invalid API key', async () => {
      process.env['ANTHROPIC_API_KEY'] = 'invalid-key';
      
      mockApiClient.countTokens.mockRejectedValueOnce(new Error('Invalid API key'));

      const result = await countTokens('test text', 'claude-sonnet-4');
      expect(result).toBeGreaterThan(0); // Should fallback to local counting
    });
  });

  describe('Caching', () => {
    beforeEach(() => {
      process.env['ANTHROPIC_API_KEY'] = 'test-key';
      process.env['ANTHROPIC_ENABLE_API'] = 'true';
      process.env['ANTHROPIC_ENABLE_CACHING'] = 'true';
    });

    it('should use cached results when available', async () => {
      const text = 'test for caching';
      const model = 'claude-sonnet-4';
      
      // Mock the API client to return cached result
      mockApiClient.getCachedResult.mockReturnValue(42);
      
      const result = await countTokens(text, model);
      expect(result).toBe(42);
      // The API should not be called since we have a cached result
      expect(mockApiClient.countTokens).not.toHaveBeenCalled();
    });

    it('should cache API results', async () => {
      const text = 'test for caching';
      const model = 'claude-sonnet-4';
      
      // Mock no cache first, then cache on second call
      mockApiClient.getCachedResult.mockReturnValueOnce(null).mockReturnValueOnce(42);
      mockApiClient.countTokens.mockResolvedValue(42);
      
      // First call - should use API
      await countTokens(text, model);
      expect(mockApiClient.countTokens).toHaveBeenCalledTimes(1);
      
      // Second call - should use cache
      const cachedResult = await countTokens(text, model);
      expect(cachedResult).toBe(42);
      expect(mockApiClient.countTokens).toHaveBeenCalledTimes(1); // Still only called once
    });
  });

  describe('OpenAI models (unchanged behavior)', () => {
    it('should handle OpenAI models synchronously', async () => {
      const result = await countTokens('Hello world', 'gpt-4');
      expect(result).toBeGreaterThan(0);
      expect(typeof result).toBe('number');
    });

    it('should match existing OpenAI tokenization', async () => {
      const text = 'Test OpenAI tokenization';
      const asyncResult = await countTokens(text, 'gpt-4o');
      const syncResult = countTokensSync(text, 'gpt-4o');
      expect(asyncResult).toBe(syncResult);
    });
  });

  describe('Unknown models', () => {
    it('should fall back to GPT-4 tokenizer for unknown models', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result = await countTokens('test text', 'unknown-model');
      expect(result).toBeGreaterThan(0);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unknown model "unknown-model"')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Backward compatibility', () => {
    it('should maintain the same interface for existing code', async () => {
      // Test that the function signature is preserved
      const result = await countTokens('test', 'claude-sonnet-4');
      expect(typeof result).toBe('number');
    });

    it('should provide sync version for backward compatibility', () => {
      const result = countTokensSync('test', 'claude-sonnet-4');
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThan(0);
    });
  });
});