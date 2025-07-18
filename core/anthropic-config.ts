import type { AnthropicConfig } from '../types/anthropic-config';

const defaultConfig: AnthropicConfig = {
  enableAPI: false,
  enableCaching: true,
  cacheSize: 1000,
  rateLimitRpm: 60,
  timeout: 30000,
};

/**
 * Load Anthropic configuration from environment variables
 */
export function getAnthropicConfig(): AnthropicConfig {
  const config: AnthropicConfig = { ...defaultConfig };

  // Environment variables
  if (process.env['ANTHROPIC_API_KEY'] !== undefined) {
    config.apiKey = process.env['ANTHROPIC_API_KEY'];
    config.enableAPI = true;
  }

  if (process.env['ANTHROPIC_ENABLE_API']) {
    config.enableAPI = process.env['ANTHROPIC_ENABLE_API'] === 'true';
  }

  if (process.env['ANTHROPIC_ENABLE_CACHING']) {
    config.enableCaching = process.env['ANTHROPIC_ENABLE_CACHING'] === 'true';
  }

  if (process.env['ANTHROPIC_CACHE_SIZE']) {
    const parsed = parseInt(process.env['ANTHROPIC_CACHE_SIZE'], 10);
    if (!isNaN(parsed)) {
      config.cacheSize = parsed;
    }
  }

  if (process.env['ANTHROPIC_RATE_LIMIT_RPM']) {
    const parsed = parseInt(process.env['ANTHROPIC_RATE_LIMIT_RPM'], 10);
    if (!isNaN(parsed)) {
      config.rateLimitRpm = parsed;
    }
  }

  if (process.env['ANTHROPIC_TIMEOUT']) {
    const parsed = parseInt(process.env['ANTHROPIC_TIMEOUT'], 10);
    if (!isNaN(parsed)) {
      config.timeout = parsed;
    }
  }

  return config;
}

/**
 * Validate Anthropic configuration
 */
export function validateAnthropicConfig(config: AnthropicConfig): void {
  if (config.cacheSize !== undefined && config.cacheSize < 0) {
    throw new Error('Cache size must be non-negative');
  }

  if (config.rateLimitRpm !== undefined && config.rateLimitRpm < 1) {
    throw new Error('Rate limit must be at least 1 request per minute');
  }

  if (config.timeout !== undefined && config.timeout < 1000) {
    throw new Error('Timeout must be at least 1000ms');
  }
}