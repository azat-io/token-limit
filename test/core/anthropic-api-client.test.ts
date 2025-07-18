import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AnthropicAPIClient } from '../../core/anthropic-api-client';
import type { AnthropicConfig } from '../../types/anthropic-config';

// Create a mock for the Anthropic SDK
const mockCountTokens = vi.fn();
const mockAnthropicInstance = {
  messages: {
    countTokens: mockCountTokens,
  },
};

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn(() => mockAnthropicInstance),
}));

describe('AnthropicAPIClient', () => {
  let client: AnthropicAPIClient;
  let mockConfig: AnthropicConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCountTokens.mockResolvedValue({ input_tokens: 10 });
    
    mockConfig = {
      apiKey: 'test-key',
      enableAPI: true,
      enableCaching: true,
      cacheSize: 100,
      rateLimitRpm: 60,
      timeout: 30000,
    };

    client = new AnthropicAPIClient(mockConfig);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with API key', () => {
      const config = { ...mockConfig, apiKey: 'sk-ant-test' };
      expect(() => new AnthropicAPIClient(config)).not.toThrow();
    });

    it('should handle missing API key gracefully', () => {
      const config = { ...mockConfig };
      delete config.apiKey;
      expect(() => new AnthropicAPIClient(config)).not.toThrow();
    });

    it('should initialize with disabled API', () => {
      const config = { ...mockConfig, enableAPI: false };
      expect(() => new AnthropicAPIClient(config)).not.toThrow();
    });
  });

  describe('Token counting', () => {
    it('should count tokens via API', async () => {
      const result = await client.countTokens('Hello world', 'claude-sonnet-4');
      expect(result).toBe(10);
    });

    it('should handle different models', async () => {
      const models = ['claude-sonnet-4', 'claude-3.5-sonnet', 'claude-3.5-haiku'];
      
      for (const model of models) {
        const result = await client.countTokens('test text', model);
        expect(result).toBeGreaterThan(0);
      }
    });

    it('should handle empty text', async () => {
      const result = await client.countTokens('', 'claude-sonnet-4');
      expect(result).toBe(0);
    });

    it('should handle very long text', async () => {
      const longText = 'This is a very long text. '.repeat(1000);
      const result = await client.countTokens(longText, 'claude-sonnet-4');
      expect(result).toBeGreaterThan(0);
    });
  });

  describe('Error handling', () => {
    it('should throw error when API client not initialized', async () => {
      const { apiKey, ...configWithoutApiKey } = mockConfig;
      const config = { ...configWithoutApiKey, enableAPI: false };
      const clientWithoutAPI = new AnthropicAPIClient(config);
      
      await expect(clientWithoutAPI.countTokens('test', 'claude-sonnet-4'))
        .rejects.toThrow('API client not initialized');
    });

    it('should handle API errors', async () => {
      // Mock the countTokens to reject with an error
      mockCountTokens.mockRejectedValueOnce(new Error('API Error'));

      await expect(client.countTokens('test', 'claude-sonnet-4'))
        .rejects.toThrow('API Error');
    });

    it('should handle rate limit errors', async () => {
      mockCountTokens.mockRejectedValueOnce(new Error('Rate limit exceeded'));

      await expect(client.countTokens('test', 'claude-sonnet-4'))
        .rejects.toThrow('Rate limit exceeded');
    });

    it('should handle network errors', async () => {
      mockCountTokens.mockRejectedValueOnce(new Error('Network error'));

      await expect(client.countTokens('test', 'claude-sonnet-4'))
        .rejects.toThrow('Network error');
    });
  });

  describe('Caching', () => {
    it('should cache results when enabled', async () => {
      const text = 'cache test';
      const model = 'claude-sonnet-4';
      
      // First call
      await client.countTokens(text, model);
      
      // Check cache
      const cached = client.getCachedResult(text, model);
      expect(cached).toBe(10);
    });

    it('should return cached results on subsequent calls', async () => {
      const text = 'cache test';
      const model = 'claude-sonnet-4';
      
      // First call
      const firstResult = await client.countTokens(text, model);
      
      // Second call should use cache
      const secondResult = await client.countTokens(text, model);
      
      expect(firstResult).toBe(secondResult);
      expect(firstResult).toBe(10);
    });

    it('should respect cache size limits', async () => {
      const smallCacheConfig = { ...mockConfig, cacheSize: 2 };
      const clientWithSmallCache = new AnthropicAPIClient(smallCacheConfig);
      
      // Fill cache beyond limit
      await clientWithSmallCache.countTokens('text1', 'claude-sonnet-4');
      await clientWithSmallCache.countTokens('text2', 'claude-sonnet-4');
      await clientWithSmallCache.countTokens('text3', 'claude-sonnet-4');
      
      // First entry should be evicted
      const firstCached = clientWithSmallCache.getCachedResult('text1', 'claude-sonnet-4');
      expect(firstCached).toBeNull();
      
      // Last entries should still be cached
      const lastCached = clientWithSmallCache.getCachedResult('text3', 'claude-sonnet-4');
      expect(lastCached).toBe(10);
    });

    it('should handle cache expiration', async () => {
      const text = 'expiry test';
      const model = 'claude-sonnet-4';
      
      // First call
      await client.countTokens(text, model);
      
      // Mock time passing (more than 24 hours)
      vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 25 * 60 * 60 * 1000);
      
      // Should not find cached result
      const expired = client.getCachedResult(text, model);
      expect(expired).toBeNull();
    });

    it('should skip caching when disabled', async () => {
      const noCacheConfig = { ...mockConfig, enableCaching: false };
      const clientWithoutCache = new AnthropicAPIClient(noCacheConfig);
      
      const text = 'no cache test';
      const model = 'claude-sonnet-4';
      
      await clientWithoutCache.countTokens(text, model);
      
      // Should not cache
      const cached = clientWithoutCache.getCachedResult(text, model);
      expect(cached).toBeNull();
    });
  });

  describe('Rate limiting', () => {
    it('should track rate limits', () => {
      expect(client.canMakeRequest()).toBe(true);
    });

    it('should respect rate limits', async () => {
      const rateLimitConfig = { ...mockConfig, rateLimitRpm: 2 };
      const clientWithRateLimit = new AnthropicAPIClient(rateLimitConfig);
      
      // Make requests up to limit
      expect(clientWithRateLimit.canMakeRequest()).toBe(true);
      await clientWithRateLimit.countTokens('test1', 'claude-sonnet-4');
      
      expect(clientWithRateLimit.canMakeRequest()).toBe(true);
      await clientWithRateLimit.countTokens('test2', 'claude-sonnet-4');
      
      // Should hit rate limit
      expect(clientWithRateLimit.canMakeRequest()).toBe(false);
    });

    it('should reset rate limit after window', async () => {
      const rateLimitConfig = { ...mockConfig, rateLimitRpm: 1 };
      const clientWithRateLimit = new AnthropicAPIClient(rateLimitConfig);
      
      // Make request to hit limit
      await clientWithRateLimit.countTokens('test', 'claude-sonnet-4');
      expect(clientWithRateLimit.canMakeRequest()).toBe(false);
      
      // Mock time passing (more than 1 minute)
      vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 61 * 1000);
      
      // Should be able to make request again
      expect(clientWithRateLimit.canMakeRequest()).toBe(true);
    });

    it('should throw error when rate limit exceeded', async () => {
      const rateLimitConfig = { ...mockConfig, rateLimitRpm: 1 };
      const clientWithRateLimit = new AnthropicAPIClient(rateLimitConfig);
      
      // First request should work
      await clientWithRateLimit.countTokens('test1', 'claude-sonnet-4');
      
      // Second request should fail
      await expect(clientWithRateLimit.countTokens('test2', 'claude-sonnet-4'))
        .rejects.toThrow('Rate limit exceeded');
    });
  });

  describe('Configuration handling', () => {
    it('should use custom timeout', async () => {
      const customConfig = { ...mockConfig, timeout: 5000 };
      expect(() => new AnthropicAPIClient(customConfig)).not.toThrow();
    });

    it('should handle invalid configuration', () => {
      const invalidConfig = { ...mockConfig, cacheSize: -1 };
      expect(() => new AnthropicAPIClient(invalidConfig)).toThrow('Cache size must be non-negative');
    });

    it('should validate rate limit configuration', () => {
      const invalidConfig = { ...mockConfig, rateLimitRpm: 0 };
      expect(() => new AnthropicAPIClient(invalidConfig)).toThrow('Rate limit must be at least 1 request per minute');
    });
  });

  describe('Cache key generation', () => {
    it('should generate consistent cache keys', () => {
      const text = 'test text';
      const model = 'claude-sonnet-4';
      
      // Mock the private method to test key generation
      const key1 = client.getCachedResult(text, model);
      const key2 = client.getCachedResult(text, model);
      
      // Should return same result (null initially, but behavior should be consistent)
      expect(key1).toBe(key2);
    });

    it('should generate different keys for different inputs', async () => {
      await client.countTokens('text1', 'claude-sonnet-4');
      await client.countTokens('text2', 'claude-sonnet-4');
      await client.countTokens('text1', 'claude-3.5-sonnet');
      
      // Each should have different cache entries
      const cache1 = client.getCachedResult('text1', 'claude-sonnet-4');
      const cache2 = client.getCachedResult('text2', 'claude-sonnet-4');
      const cache3 = client.getCachedResult('text1', 'claude-3.5-sonnet');
      
      expect(cache1).toBe(10);
      expect(cache2).toBe(10);
      expect(cache3).toBe(10);
    });
  });
});