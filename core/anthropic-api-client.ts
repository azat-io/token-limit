import Anthropic from '@anthropic-ai/sdk';
import type { AnthropicConfig, TokenCacheEntry } from '../types/anthropic-config';
import { validateAnthropicConfig } from './anthropic-config';

/**
 * Anthropic API client with caching and rate limiting
 */
export class AnthropicAPIClient {
  private client: Anthropic | null = null;
  private cache = new Map<string, TokenCacheEntry>();
  private rateLimiter: { requests: number; resetTime: number } = { requests: 0, resetTime: 0 };
  private config: AnthropicConfig;
  
  constructor(config: AnthropicConfig) {
    this.config = config;
    // Validate configuration
    validateAnthropicConfig(config);
    
    // Initialize client if API is enabled and key is provided
    if (config.apiKey && config.enableAPI) {
      this.client = new Anthropic({
        apiKey: config.apiKey,
        timeout: config.timeout || 30000,
      });
    }
  }

  /**
   * Count tokens for text using Anthropic API
   */
  async countTokens(text: string, model: string): Promise<number> {
    if (!this.client) {
      throw new Error('API client not initialized');
    }

    // Handle empty text
    if (text.length === 0) {
      return 0;
    }

    // Check cache first
    if (this.config.enableCaching) {
      const cached = this.getCachedResult(text, model);
      if (cached !== null) {
        return cached;
      }
    }

    // Check rate limits
    if (!this.canMakeRequest()) {
      throw new Error('Rate limit exceeded');
    }

    try {
      // Use the Anthropic API to count tokens
      const result = await this.client.messages.countTokens({
        model,
        messages: [{ role: 'user', content: text }],
      });

      const tokenCount = result.input_tokens;
      
      // Cache the result
      if (this.config.enableCaching) {
        this.setCachedResult(text, model, tokenCount);
      }

      this.updateRateLimit();
      return tokenCount;
    } catch (error) {
      console.warn('Anthropic API token counting failed:', error);
      throw error;
    }
  }

  /**
   * Get cached token count result
   */
  getCachedResult(text: string, model: string): number | null {
    const key = this.getCacheKey(text, model);
    const cached = this.cache.get(key);
    
    if (cached) {
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      if (Date.now() - cached.timestamp < maxAge) {
        return cached.value;
      }
      this.cache.delete(key);
    }
    
    return null;
  }

  /**
   * Set cached token count result
   */
  private setCachedResult(text: string, model: string, tokens: number): void {
    const key = this.getCacheKey(text, model);
    this.cache.set(key, { value: tokens, timestamp: Date.now() });
    
    // Enforce cache size limit
    if (this.cache.size > (this.config.cacheSize || 1000)) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
  }

  /**
   * Generate cache key for text and model
   */
  private getCacheKey(text: string, model: string): string {
    // Create deterministic cache key
    const content = `${model}:${text}`;
    return Buffer.from(content).toString('base64');
  }

  /**
   * Check if we can make a request within rate limits
   */
  canMakeRequest(): boolean {
    const now = Date.now();
    const rpmLimit = this.config.rateLimitRpm || 60;
    const windowMs = 60 * 1000; // 1 minute
    
    if (now > this.rateLimiter.resetTime) {
      this.rateLimiter = { requests: 0, resetTime: now + windowMs };
    }
    
    return this.rateLimiter.requests < rpmLimit;
  }

  /**
   * Update rate limit counter
   */
  private updateRateLimit(): void {
    this.rateLimiter.requests++;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  getCacheSize(): number {
    return this.cache.size;
  }
}