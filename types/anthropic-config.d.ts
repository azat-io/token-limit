/**
 * Configuration options for Anthropic API token counting
 */
export interface AnthropicConfig {
  /** Anthropic API key */
  apiKey?: string;
  
  /** Enable API-based token counting */
  enableAPI: boolean;
  
  /** Enable result caching */
  enableCaching: boolean;
  
  /** Maximum cache size (number of entries) */
  cacheSize: number;
  
  /** Rate limit in requests per minute */
  rateLimitRpm: number;
  
  /** Request timeout in milliseconds */
  timeout: number;
}

/**
 * Cache entry for token counting results
 */
export interface TokenCacheEntry {
  /** Cached token count */
  value: number;
  /** Timestamp when cached */
  timestamp: number;
}

/**
 * Rate limiter state
 */
export interface RateLimiterState {
  /** Number of requests made in current window */
  requests: number;
  /** Timestamp when rate limit window resets */
  resetTime: number;
}

/**
 * API client options for initialization
 */
export interface APIClientOptions extends AnthropicConfig {
  /** Custom user agent */
  userAgent?: string;
  /** Custom base URL */
  baseURL?: string;
}