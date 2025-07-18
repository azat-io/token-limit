import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getAnthropicConfig, validateAnthropicConfig } from '../../core/anthropic-config';
import type { AnthropicConfig } from '../../types/anthropic-config';

describe('Anthropic Configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear environment variables
    delete process.env['ANTHROPIC_API_KEY'];
    delete process.env['ANTHROPIC_ENABLE_API'];
    delete process.env['ANTHROPIC_ENABLE_CACHING'];
    delete process.env['ANTHROPIC_CACHE_SIZE'];
    delete process.env['ANTHROPIC_RATE_LIMIT_RPM'];
    delete process.env['ANTHROPIC_TIMEOUT'];
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getAnthropicConfig', () => {
    it('should return default configuration when no env vars set', () => {
      const config = getAnthropicConfig();
      
      expect(config.enableAPI).toBe(false);
      expect(config.enableCaching).toBe(true);
      expect(config.cacheSize).toBe(1000);
      expect(config.rateLimitRpm).toBe(60);
      expect(config.timeout).toBe(30000);
      expect(config.apiKey).toBeUndefined();
    });

    it('should enable API when API key is provided', () => {
      process.env['ANTHROPIC_API_KEY'] = 'sk-ant-test';
      
      const config = getAnthropicConfig();
      expect(config.enableAPI).toBe(true);
      expect(config.apiKey).toBe('sk-ant-test');
    });

    it('should respect explicit API enable flag', () => {
      process.env['ANTHROPIC_ENABLE_API'] = 'true';
      
      const config = getAnthropicConfig();
      expect(config.enableAPI).toBe(true);
    });

    it('should respect explicit API disable flag', () => {
      process.env['ANTHROPIC_API_KEY'] = 'sk-ant-test';
      process.env['ANTHROPIC_ENABLE_API'] = 'false';
      
      const config = getAnthropicConfig();
      expect(config.enableAPI).toBe(false);
      expect(config.apiKey).toBe('sk-ant-test'); // Key should still be loaded
    });

    it('should configure caching settings', () => {
      process.env['ANTHROPIC_ENABLE_CACHING'] = 'false';
      process.env['ANTHROPIC_CACHE_SIZE'] = '500';
      
      const config = getAnthropicConfig();
      expect(config.enableCaching).toBe(false);
      expect(config.cacheSize).toBe(500);
    });

    it('should configure rate limiting', () => {
      process.env['ANTHROPIC_RATE_LIMIT_RPM'] = '30';
      
      const config = getAnthropicConfig();
      expect(config.rateLimitRpm).toBe(30);
    });

    it('should configure timeout', () => {
      process.env['ANTHROPIC_TIMEOUT'] = '15000';
      
      const config = getAnthropicConfig();
      expect(config.timeout).toBe(15000);
    });

    it('should handle all environment variables together', () => {
      process.env['ANTHROPIC_API_KEY'] = 'sk-ant-full-test';
      process.env['ANTHROPIC_ENABLE_API'] = 'true';
      process.env['ANTHROPIC_ENABLE_CACHING'] = 'true';
      process.env['ANTHROPIC_CACHE_SIZE'] = '2000';
      process.env['ANTHROPIC_RATE_LIMIT_RPM'] = '120';
      process.env['ANTHROPIC_TIMEOUT'] = '45000';
      
      const config = getAnthropicConfig();
      
      expect(config.apiKey).toBe('sk-ant-full-test');
      expect(config.enableAPI).toBe(true);
      expect(config.enableCaching).toBe(true);
      expect(config.cacheSize).toBe(2000);
      expect(config.rateLimitRpm).toBe(120);
      expect(config.timeout).toBe(45000);
    });

    it('should handle invalid numeric values gracefully', () => {
      process.env['ANTHROPIC_CACHE_SIZE'] = 'invalid';
      process.env['ANTHROPIC_RATE_LIMIT_RPM'] = 'not-a-number';
      process.env['ANTHROPIC_TIMEOUT'] = 'invalid-timeout';
      
      const config = getAnthropicConfig();
      
      // Should use default values for invalid numbers
      expect(config.cacheSize).toBe(1000); // Default
      expect(config.rateLimitRpm).toBe(60); // Default
      expect(config.timeout).toBe(30000); // Default
    });

    it('should handle empty string values', () => {
      process.env['ANTHROPIC_API_KEY'] = '';
      process.env['ANTHROPIC_ENABLE_API'] = '';
      process.env['ANTHROPIC_ENABLE_CACHING'] = '';
      
      const config = getAnthropicConfig();
      
      expect(config.apiKey).toBe('');
      expect(config.enableAPI).toBe(true); // Empty string API key still enables API
      expect(config.enableCaching).toBe(true); // Default for empty string
    });
  });

  describe('validateAnthropicConfig', () => {
    it('should validate complete configuration', () => {
      const config: AnthropicConfig = {
        apiKey: 'sk-ant-test',
        enableAPI: true,
        enableCaching: true,
        cacheSize: 1000,
        rateLimitRpm: 60,
        timeout: 30000,
      };
      
      expect(() => validateAnthropicConfig(config)).not.toThrow();
    });

    it('should validate minimal configuration', () => {
      const config: AnthropicConfig = {
        enableAPI: false,
        enableCaching: false,
        cacheSize: 0,
        rateLimitRpm: 1,
        timeout: 1000,
      };
      
      expect(() => validateAnthropicConfig(config)).not.toThrow();
    });

    it('should handle missing API key gracefully', () => {
      const config: AnthropicConfig = {
        enableAPI: true,
        enableCaching: true,
        cacheSize: 1000,
        rateLimitRpm: 60,
        timeout: 30000,
      };
      
      expect(() => validateAnthropicConfig(config)).not.toThrow();
    });

    it('should throw on negative cache size', () => {
      const config: AnthropicConfig = {
        enableAPI: false,
        enableCaching: true,
        cacheSize: -1,
        rateLimitRpm: 60,
        timeout: 30000,
      };
      
      expect(() => validateAnthropicConfig(config)).toThrow('Cache size must be non-negative');
    });

    it('should throw on invalid rate limit', () => {
      const config: AnthropicConfig = {
        enableAPI: false,
        enableCaching: true,
        cacheSize: 1000,
        rateLimitRpm: 0,
        timeout: 30000,
      };
      
      expect(() => validateAnthropicConfig(config)).toThrow('Rate limit must be at least 1 request per minute');
    });

    it('should throw on invalid timeout', () => {
      const config: AnthropicConfig = {
        enableAPI: false,
        enableCaching: true,
        cacheSize: 1000,
        rateLimitRpm: 60,
        timeout: 500,
      };
      
      expect(() => validateAnthropicConfig(config)).toThrow('Timeout must be at least 1000ms');
    });

    it('should validate boundary values', () => {
      const config: AnthropicConfig = {
        enableAPI: false,
        enableCaching: true,
        cacheSize: 0, // Minimum valid value
        rateLimitRpm: 1, // Minimum valid value
        timeout: 1000, // Minimum valid value
      };
      
      expect(() => validateAnthropicConfig(config)).not.toThrow();
    });

    it('should validate large values', () => {
      const config: AnthropicConfig = {
        enableAPI: false,
        enableCaching: true,
        cacheSize: 10000,
        rateLimitRpm: 1000,
        timeout: 300000,
      };
      
      expect(() => validateAnthropicConfig(config)).not.toThrow();
    });

    it('should handle undefined optional values', () => {
      const config: AnthropicConfig = {
        enableAPI: false,
        enableCaching: true,
        cacheSize: 1000,
        rateLimitRpm: 60,
        timeout: 30000,
      };
      
      expect(() => validateAnthropicConfig(config)).not.toThrow();
    });
  });

  describe('Configuration edge cases', () => {
    it('should handle boolean string values correctly', () => {
      process.env['ANTHROPIC_ENABLE_API'] = 'false';
      process.env['ANTHROPIC_ENABLE_CACHING'] = 'true';
      
      const config = getAnthropicConfig();
      expect(config.enableAPI).toBe(false);
      expect(config.enableCaching).toBe(true);
    });

    it('should handle case sensitivity', () => {
      process.env['ANTHROPIC_ENABLE_API'] = 'True';
      process.env['ANTHROPIC_ENABLE_CACHING'] = 'FALSE';
      
      const config = getAnthropicConfig();
      expect(config.enableAPI).toBe(false); // Only 'true' should be true
      expect(config.enableCaching).toBe(false); // Only 'true' should be true
    });

    it('should handle zero values correctly', () => {
      process.env['ANTHROPIC_CACHE_SIZE'] = '0';
      process.env['ANTHROPIC_RATE_LIMIT_RPM'] = '1';
      process.env['ANTHROPIC_TIMEOUT'] = '1000';
      
      const config = getAnthropicConfig();
      expect(config.cacheSize).toBe(0);
      expect(config.rateLimitRpm).toBe(1);
      expect(config.timeout).toBe(1000);
      
      expect(() => validateAnthropicConfig(config)).not.toThrow();
    });

    it('should handle whitespace in environment variables', () => {
      process.env['ANTHROPIC_API_KEY'] = '  sk-ant-test  ';
      process.env['ANTHROPIC_ENABLE_API'] = ' true ';
      
      const config = getAnthropicConfig();
      expect(config.apiKey).toBe('  sk-ant-test  '); // Preserve whitespace in API key
      expect(config.enableAPI).toBe(false); // Whitespace should make it not exactly 'true'
    });
  });

  describe('Configuration integration', () => {
    it('should work with getAnthropicConfig and validateAnthropicConfig together', () => {
      process.env['ANTHROPIC_API_KEY'] = 'sk-ant-integration-test';
      process.env['ANTHROPIC_ENABLE_API'] = 'true';
      process.env['ANTHROPIC_CACHE_SIZE'] = '500';
      process.env['ANTHROPIC_RATE_LIMIT_RPM'] = '30';
      
      const config = getAnthropicConfig();
      
      expect(() => validateAnthropicConfig(config)).not.toThrow();
      expect(config.apiKey).toBe('sk-ant-integration-test');
      expect(config.enableAPI).toBe(true);
      expect(config.cacheSize).toBe(500);
      expect(config.rateLimitRpm).toBe(30);
    });

    it('should provide sensible defaults that pass validation', () => {
      const config = getAnthropicConfig();
      expect(() => validateAnthropicConfig(config)).not.toThrow();
    });
  });
});